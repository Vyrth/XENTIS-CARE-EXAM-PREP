import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 px-6">
      <main className="max-w-2xl mx-auto text-center">
        <h1 className="font-heading text-4xl font-bold text-slate-900 dark:text-white mb-4">
          Xentis Care Exam Prep
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8">
          Premium nursing board preparation for LVN, RN, FNP, and PMHNP.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Start Free
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            View Pricing
          </Link>
        </div>
      </main>
      <footer className="mt-16 text-sm text-slate-500 dark:text-slate-400">
        <Link href="/legal/terms" className="hover:underline mr-4">
          Terms
        </Link>
        <Link href="/legal/privacy" className="hover:underline mr-4">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
