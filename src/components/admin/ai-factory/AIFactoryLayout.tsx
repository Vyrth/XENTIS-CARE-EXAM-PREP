"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Icons } from "@/components/ui/icons";
import { PresetPicker } from "./PresetPicker";
import { ProductionPlanningPanel } from "./ProductionPlanningPanel";
import { QuestionsTab } from "./QuestionsTab";
import { StudyGuidesTab } from "./StudyGuidesTab";
import { FlashcardsTab } from "./FlashcardsTab";
import { HighYieldTab } from "./HighYieldTab";
import { BatchJobsTab } from "./BatchJobsTab";
import { CampaignDashboardTab } from "./CampaignDashboardTab";
import { GenerationHistoryTab } from "./GenerationHistoryTab";
import { PilotGenerationTab } from "./PilotGenerationTab";
import { applyPresetToConfig } from "@/lib/ai/factory/presets";
import { resolveSelectedTrack, isTrackIdUuid } from "@/lib/ai/factory/resolve-track";
import { TrackDebugPanel } from "./TrackDebugPanel";
import type { GenerationConfig } from "@/lib/ai/factory/types";
import type { AIFactoryPageData } from "@/lib/admin/ai-factory-loaders";
import type { GenerationPreset } from "@/lib/ai/factory/presets";
import type { AIFactoryPrefillParams } from "@/lib/admin/ai-factory-gap-links";
import type { TrackProductionRow } from "@/lib/admin/production-planning-loaders";
import type { RoadmapCoverageGaps } from "@/lib/admin/roadmap-coverage-loaders";
import type { PilotTrackOptions } from "@/lib/admin/pilot-loaders";
import type { RNSystemCoverageRow } from "@/lib/admin/rn-system-coverage-loader";
import type { FNPSystemCoverageRow } from "@/lib/admin/fnp-system-coverage-loader";
import type { PMHNPSystemCoverageRow } from "@/lib/admin/pmhnp-system-coverage-loader";
import type { LVNSystemCoverageRow } from "@/lib/admin/lvn-system-coverage-loader";

const DEFAULT_CONFIG: GenerationConfig = {
  trackId: "",
  trackSlug: "rn",
  saveStatus: "draft",
};

export interface AIFactoryLayoutProps {
  data: AIFactoryPageData;
  initialPrefill?: AIFactoryPrefillParams | null;
  productionData?: TrackProductionRow[];
  coverageGaps?: RoadmapCoverageGaps[];
  pilotOptions?: PilotTrackOptions[];
  rnSystemCoverage?: RNSystemCoverageRow[];
  fnpSystemCoverage?: FNPSystemCoverageRow[];
  pmhnpSystemCoverage?: PMHNPSystemCoverageRow[];
  lvnSystemCoverage?: LVNSystemCoverageRow[];
}

export function AIFactoryLayout({
  data,
  initialPrefill,
  productionData = [],
  coverageGaps = [],
  pilotOptions = [],
  rnSystemCoverage = [],
  fnpSystemCoverage = [],
  pmhnpSystemCoverage = [],
  lvnSystemCoverage = [],
}: AIFactoryLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<GenerationConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState("pilot");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [pendingGeneratePreset, setPendingGeneratePreset] = useState<GenerationPreset | null>(null);
  const prefillAppliedRef = useRef(false);

  // Canonical: config.trackId must always be exam_tracks.id (UUID). Sync when trackId is empty, slug, or stale.
  useEffect(() => {
    if (!data.tracks.length) return;
    const resolved = resolveSelectedTrack(data.tracks, config.trackId, config.trackSlug);
    if (!resolved) {
      // When we have trackSlug but no trackId (e.g. from DEFAULT_CONFIG), resolve by slug
      if (config.trackSlug && !config.trackId?.trim()) {
        const bySlug = data.tracks.find((t) => t.slug?.toLowerCase() === config.trackSlug?.toLowerCase());
        if (bySlug) {
          setConfig((prev) => ({ ...prev, trackId: bySlug.id, trackSlug: bySlug.slug.toLowerCase() as GenerationConfig["trackSlug"] }));
        }
      }
      return;
    }
    const needsSync = !isTrackIdUuid(config.trackId) || resolved.id !== config.trackId;
    if (needsSync) {
      setConfig((prev) => ({ ...prev, trackId: resolved.id, trackSlug: resolved.slug }));
    }
  }, [config.trackId, config.trackSlug, data.tracks]);

  // Apply initialPrefill from URL (trackId, tab, systemId, topicId, domainId)
  useEffect(() => {
    if (!initialPrefill || prefillAppliedRef.current) return;
    const track =
      data.tracks.find((t) => t.id === initialPrefill!.trackId) ??
      data.tracks.find((t) => t.slug?.toLowerCase() === initialPrefill!.trackId?.toLowerCase());
    if (!track) return;

    const system = initialPrefill.systemId
      ? data.systems.find((s) => s.id === initialPrefill.systemId && s.examTrackId === track.id)
      : undefined;
    const topic = initialPrefill.topicId
      ? data.topics.find((t) => t.id === initialPrefill.topicId)
      : undefined;
    const domain = initialPrefill.domainId
      ? data.domains.find((d) => d.id === initialPrefill.domainId)
      : undefined;

    setConfig((prev) => ({
      ...prev,
      trackId: track.id,
      trackSlug: track.slug.toLowerCase() as GenerationConfig["trackSlug"],
      systemId: system?.id,
      systemName: system?.name,
      topicId: topic?.id,
      topicName: topic?.name,
      domainId: domain?.id,
      domainName: domain?.name,
    }));
    setActiveTab(initialPrefill.tab);
    prefillAppliedRef.current = true;
  }, [initialPrefill, data]);

  // Sync config from URL when trackId in URL differs from config (e.g. direct link, back button)
  useEffect(() => {
    const urlTrackId = searchParams.get("trackId");
    if (!urlTrackId?.trim() || !data.tracks.length) return;
    const track =
      data.tracks.find((t) => t.id === urlTrackId.trim()) ??
      data.tracks.find((t) => t.slug?.toLowerCase() === urlTrackId.trim().toLowerCase());
    if (!track || track.id === config.trackId) return;
    setConfig((prev) => ({
      ...prev,
      trackId: track.id,
      trackSlug: track.slug.toLowerCase() as GenerationConfig["trackSlug"],
    }));
  }, [searchParams, data.tracks, config.trackId]);

  // Keep selected track in URL for persistence across refresh.
  // Guard: only replace when target URL differs from current (avoids redirect loop).
  useEffect(() => {
    if (!config.trackId?.trim()) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const currentTrackId = params.get("trackId");
    const currentTab = params.get("tab");
    if (currentTrackId === config.trackId && (currentTab === activeTab || (!params.has("tab") && activeTab === "pilot"))) {
      return;
    }
    params.set("trackId", config.trackId);
    if (!params.has("tab")) params.set("tab", activeTab);
    const qs = params.toString();
    const target = qs ? `${pathname}?${qs}` : pathname;
    const currentFull = pathname + (window.location.search ? window.location.search : "");
    const targetFull = pathname + (qs ? `?${qs}` : "");
    if (currentFull === targetFull) return;
    router.replace(target, { scroll: false });
  }, [config.trackId, activeTab, pathname]);

  const handlePresetSelect = useCallback(
    (preset: GenerationPreset, generateNow = false) => {
      try {
        const partial = applyPresetToConfig(preset, data);
        const resolved = resolveSelectedTrack(data.tracks, partial.trackId, partial.trackSlug);
        if (!resolved) {
          console.warn("[AIFactory] Preset track not found:", preset.trackSlug);
          return;
        }
        setConfig((prev) => ({
          ...prev,
          ...partial,
          trackId: resolved.id,
          trackSlug: resolved.slug,
        }));
        setActiveTab(preset.tab);
        setSelectedPresetId(preset.id);
        if (generateNow) {
          setPendingGeneratePreset(preset);
        }
      } catch (err) {
        console.warn("[AIFactory] Preset apply failed:", err);
      }
    },
    [data]
  );

  const clearPendingGenerate = useCallback(() => {
    setPendingGeneratePreset(null);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
        <span className="text-amber-600 dark:text-amber-400">{Icons.alertTriangle}</span>
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>AI Content Factory:</strong> All generated content is saved as draft or editor_review only.
          Human review required before publish. Every item is auditable.
        </p>
      </div>

      <Card padding="md">
        <PresetPicker
          onSelect={(p, generateNow) => handlePresetSelect(p, generateNow)}
          selectedPresetId={selectedPresetId}
        />
        <TrackDebugPanel config={config} tracks={data.tracks} />
      </Card>

      {productionData.length > 0 && (
        <ProductionPlanningPanel
          data={productionData}
          coverageGaps={coverageGaps}
          rnSystemCoverage={rnSystemCoverage}
          fnpSystemCoverage={fnpSystemCoverage}
          pmhnpSystemCoverage={pmhnpSystemCoverage}
          lvnSystemCoverage={lvnSystemCoverage}
        />
      )}

      <Tabs value={activeTab} defaultValue="questions" onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="pilot">Pilot Run</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="study-guides">Study Guides</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="high-yield">High-Yield</TabsTrigger>
          <TabsTrigger value="campaign">Campaign</TabsTrigger>
          <TabsTrigger value="batch">Batch Jobs</TabsTrigger>
          <TabsTrigger value="history">Generation History</TabsTrigger>
        </TabsList>

        <TabsContent value="pilot" className="mt-4">
          <PilotGenerationTab data={data} pilotOptions={pilotOptions} />
        </TabsContent>

        <TabsContent value="questions" className="mt-4">
          <QuestionsTab
            config={config}
            data={data}
            onConfigChange={setConfig}
            pendingGeneratePreset={activeTab === "questions" ? pendingGeneratePreset : null}
            onGenerateTriggered={clearPendingGenerate}
          />
        </TabsContent>

        <TabsContent value="study-guides" className="mt-4">
          <StudyGuidesTab
            config={config}
            data={data}
            onConfigChange={setConfig}
            pendingGeneratePreset={activeTab === "study-guides" ? pendingGeneratePreset : null}
            onGenerateTriggered={clearPendingGenerate}
          />
        </TabsContent>

        <TabsContent value="flashcards" className="mt-4">
          <FlashcardsTab
            config={config}
            data={data}
            onConfigChange={setConfig}
            pendingGeneratePreset={activeTab === "flashcards" ? pendingGeneratePreset : null}
            onGenerateTriggered={clearPendingGenerate}
          />
        </TabsContent>

        <TabsContent value="high-yield" className="mt-4">
          <HighYieldTab
            config={config}
            data={data}
            onConfigChange={setConfig}
            pendingGeneratePreset={activeTab === "high-yield" ? pendingGeneratePreset : null}
            onGenerateTriggered={clearPendingGenerate}
          />
        </TabsContent>

        <TabsContent value="campaign" className="mt-4">
          <CampaignDashboardTab data={data} />
        </TabsContent>

        <TabsContent value="batch" className="mt-4">
          <BatchJobsTab config={config} data={data} onConfigChange={setConfig} />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <GenerationHistoryTab data={data} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
