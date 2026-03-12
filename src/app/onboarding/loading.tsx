export default function OnboardingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto" />
          <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mx-auto mt-3" />
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
