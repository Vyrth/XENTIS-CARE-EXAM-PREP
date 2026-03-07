export default function DashboardLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-8 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="mt-2 h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
      <div>
        <div className="h-6 w-40 mb-4 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
