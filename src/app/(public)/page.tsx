import {
  LandingHero,
  LandingTracks,
  LandingLifestyleImages,
  LandingWhyChoose,
  LandingHowItWorks,
  LandingJadeTutor,
  LandingAdaptive,
  LandingPlans,
  LandingCredibility,
  LandingCTA,
  LandingFooter,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <LandingHero />
      <LandingLifestyleImages />
      <LandingTracks />
      <LandingWhyChoose />
      <LandingHowItWorks />
      <LandingJadeTutor />
      <LandingAdaptive />
      <LandingPlans />
      <LandingCredibility />
      <LandingCTA />
      <LandingFooter />
    </div>
  );
}
