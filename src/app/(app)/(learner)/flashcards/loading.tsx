export default function FlashcardsLoading() {
  return (
    <div className="p-6 lg:p-8 space-y-6 animate-pulse">
      <div>
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="mt-2 h-4 w-72 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
