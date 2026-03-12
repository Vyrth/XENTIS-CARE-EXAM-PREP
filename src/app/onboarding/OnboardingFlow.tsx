"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlanSelectStep } from "@/components/billing/PlanSelectStep";
import { OnboardingForm } from "./OnboardingForm";

type Track = { id: string; slug: string; name: string };

export interface OnboardingFlowProps {
  hasSubscription: boolean;
  checkoutSuccess?: boolean;
  tracks: Track[];
  loadError: string | null;
  initialTrackId: string | null;
  initialTargetDate: string | null;
  initialStudyMinutes: number | null;
  initialStudyMode: string | null;
}

export function OnboardingFlow({
  hasSubscription,
  checkoutSuccess = false,
  tracks,
  loadError,
  initialTrackId,
  initialTargetDate,
  initialStudyMinutes,
  initialStudyMode,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [pollCount, setPollCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    const n = parseInt(sessionStorage.getItem("onboarding_checkout_poll") ?? "0", 10);
    return n;
  });
  const polling = checkoutSuccess && !hasSubscription && pollCount < 5;

  useEffect(() => {
    if (checkoutSuccess && hasSubscription) {
      try {
        sessionStorage.removeItem("onboarding_checkout_poll");
      } catch {
        /* ignore */
      }
    }
  }, [checkoutSuccess, hasSubscription]);

  useEffect(() => {
    if (!polling) return;
    const t = setTimeout(() => {
      const next = pollCount + 1;
      try {
        sessionStorage.setItem("onboarding_checkout_poll", String(next));
      } catch {
        /* ignore */
      }
      setPollCount(next);
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [polling, pollCount, router]);

  if (!hasSubscription) {
    if (polling) {
      return (
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Completing your purchase
          </h1>
          <p className="mt-4 text-slate-600 dark:text-slate-400">
            Please wait a moment while we set up your subscription…
          </p>
          <p className="mt-2 text-sm text-slate-500">
            If this takes more than a few seconds, refresh the page.
          </p>
        </div>
      );
    }
    return (
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Choose your plan
          </h1>
          <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
            Select a plan to start your exam prep journey
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <PlanSelectStep onTrialSelected={() => router.refresh()} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Set up your study plan
        </h1>
        <p className="mt-2 text-sm text-slate-800 dark:text-slate-200">
          We&apos;ll personalize your experience
        </p>
      </div>
      <OnboardingForm
        tracks={tracks}
        loadError={loadError}
        initialTrackId={initialTrackId}
        initialTargetDate={initialTargetDate}
        initialStudyMinutes={initialStudyMinutes}
        initialStudyMode={initialStudyMode}
      />
    </div>
  );
}
