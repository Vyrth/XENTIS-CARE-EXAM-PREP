export default function AdaptiveExamLoading() {
  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto animate-pulse space-y-6">
      <div>
        <div className="h-8 w-56 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="mt-2 h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
    </div>
  );
}
