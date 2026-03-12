/**
 * AI Generation Rate Control
 *
 * Hardens 25k+ question generation without crashing OpenAI, Vercel, or Supabase.
 *
 * THROTTLING RULES:
 * - Global concurrency: max 6 concurrent AI requests across all workers
 * - Per-model concurrency: max 4 concurrent requests per model (e.g. gpt-4o-mini)
 * - Per-minute throttle: max 50 requests/min global, 35/min per model
 *
 * CIRCUIT BREAKER:
 * - Window: last 20 requests
 * - Threshold: if ≥40% fail (8+ of 20), open circuit
 * - Half-open: after 60s, allow 1 probe request
 * - On probe success: close circuit; on failure: reset 60s
 *
 * PAUSE/FAILOVER:
 * - When circuit opens: acquireSlot() throws CircuitOpenError
 * - Workers/scheduler should stop claiming new jobs until circuit closes
 * - Existing in-flight requests complete; no new work starts
 */

export const RATE_LIMITS = {
  /** Max concurrent AI requests globally */
  globalConcurrency: 6,
  /** Max concurrent requests per model */
  perModelConcurrency: 4,
  /** Max requests per minute (global) */
  requestsPerMinuteGlobal: 50,
  /** Max requests per minute per model */
  requestsPerMinutePerModel: 35,
  /** Request timeout (ms) - applied at provider-client level */
  requestTimeoutMs: 90_000,
  /** Circuit breaker: min requests in window to evaluate */
  circuitMinRequests: 10,
  /** Circuit breaker: failure rate threshold (0–1) to open */
  circuitFailureThreshold: 0.4,
  /** Circuit breaker: cooldown (ms) before half-open probe */
  circuitCooldownMs: 60_000,
} as const;

export type CircuitState = "closed" | "open" | "half_open";

class SlidingWindowCounter {
  private timestamps: number[] = [];
  private readonly maxPerMinute: number;
  private readonly windowMs = 60_000;

  constructor(maxPerMinute: number) {
    this.maxPerMinute = maxPerMinute;
  }

  prune(): void {
    const cutoff = Date.now() - this.windowMs;
    this.timestamps = this.timestamps.filter((t) => t > cutoff);
  }

  record(): void {
    this.prune();
    this.timestamps.push(Date.now());
  }

  canProceed(): boolean {
    this.prune();
    return this.timestamps.length < this.maxPerMinute;
  }

  /** Ms to wait until oldest request exits window. 0 if can proceed now. */
  waitMs(): number {
    this.prune();
    if (this.timestamps.length < this.maxPerMinute) return 0;
    const oldest = Math.min(...this.timestamps);
    return Math.max(0, oldest + this.windowMs - Date.now());
  }

  count(): number {
    this.prune();
    return this.timestamps.length;
  }
}

class Semaphore {
  private current = 0;
  private waitQueue: Array<() => void> = [];

  constructor(private readonly max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
    this.current++;
  }

  release(): void {
    this.current = Math.max(0, this.current - 1);
    const next = this.waitQueue.shift();
    if (next) next();
  }
}

interface CircuitBreakerRecord {
  success: boolean;
  at: number;
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private records: CircuitBreakerRecord[] = [];
  private openedAt = 0;

  record(success: boolean): void {
    this.records.push({ success, at: Date.now() });
    const cutoff = Date.now() - 120_000; // 2 min window
    this.records = this.records.filter((r) => r.at > cutoff);
    if (this.records.length > 50) this.records = this.records.slice(-50);

    if (this.state === "half_open") {
      this.state = success ? "closed" : "open";
      if (!success) this.openedAt = Date.now();
      this.records = [];
      return;
    }

    if (this.state === "open") return;

    const recent = this.records.filter((r) => r.at > Date.now() - 60_000);
    if (recent.length >= RATE_LIMITS.circuitMinRequests) {
      const failures = recent.filter((r) => !r.success).length;
      const rate = failures / recent.length;
      if (rate >= RATE_LIMITS.circuitFailureThreshold) {
        this.state = "open";
        this.openedAt = Date.now();
      }
    }
  }

  canProceed(): boolean {
    if (this.state === "closed") return true;
    if (this.state === "half_open") return true;
    if (Date.now() - this.openedAt >= RATE_LIMITS.circuitCooldownMs) {
      this.state = "half_open";
      return true;
    }
    return false;
  }

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.openedAt >= RATE_LIMITS.circuitCooldownMs) {
      this.state = "half_open";
    }
    return this.state;
  }
}

const globalSemaphore = new Semaphore(RATE_LIMITS.globalConcurrency);
const modelSemaphores = new Map<string, Semaphore>();
const globalPerMinute = new SlidingWindowCounter(RATE_LIMITS.requestsPerMinuteGlobal);
const modelPerMinute = new Map<string, SlidingWindowCounter>();
const circuitBreaker = new CircuitBreaker();

function getModelSemaphore(model: string): Semaphore {
  let s = modelSemaphores.get(model);
  if (!s) {
    s = new Semaphore(RATE_LIMITS.perModelConcurrency);
    modelSemaphores.set(model, s);
  }
  return s;
}

function getModelPerMinute(model: string): SlidingWindowCounter {
  let c = modelPerMinute.get(model);
  if (!c) {
    c = new SlidingWindowCounter(RATE_LIMITS.requestsPerMinutePerModel);
    modelPerMinute.set(model, c);
  }
  return c;
}

export class CircuitOpenError extends Error {
  constructor() {
    super("Circuit breaker open: AI generation paused due to high failure rate");
    this.name = "CircuitOpenError";
  }
}

export class ThrottleExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThrottleExceededError";
  }
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Acquire a slot before making an AI request.
 * - Checks circuit breaker (throws CircuitOpenError if open)
 * - Waits for per-minute throttle (blocks until slot available)
 * - Waits for global + per-model concurrency
 * Call releaseSlot() in finally after request completes.
 */
export async function acquireSlot(model: string): Promise<void> {
  if (!circuitBreaker.canProceed()) {
    throw new CircuitOpenError();
  }

  const modelPerMin = getModelPerMinute(model);
  while (!modelPerMin.canProceed() || !globalPerMinute.canProceed()) {
    const w = Math.max(1000, Math.min(modelPerMin.waitMs(), globalPerMinute.waitMs()));
    await delay(Math.min(w, 5000));
  }

  await globalSemaphore.acquire();
  const modelSem = getModelSemaphore(model);
  await modelSem.acquire();
  globalPerMinute.record();
  modelPerMin.record();
}

/**
 * Release slot after request completes (success or failure).
 */
export function releaseSlot(model: string): void {
  getModelSemaphore(model).release();
  globalSemaphore.release();
}

/**
 * Record success for circuit breaker.
 */
export function recordSuccess(): void {
  circuitBreaker.record(true);
}

/**
 * Record failure for circuit breaker.
 */
export function recordFailure(): void {
  circuitBreaker.record(false);
}

/**
 * Check if circuit is open (call before claiming jobs).
 */
export function isCircuitOpen(): boolean {
  return circuitBreaker.getState() === "open";
}

/**
 * Get current circuit state.
 */
export function getCircuitState(): CircuitState {
  return circuitBreaker.getState();
}
