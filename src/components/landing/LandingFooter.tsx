import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="py-12 px-6 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-heading font-bold text-slate-900 dark:text-white">
          Xentis Care
        </p>
        <nav className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400">
          <Link href="/pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Pricing
          </Link>
          <Link href="/faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            FAQ
          </Link>
          <Link href="/legal/terms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Terms
          </Link>
          <Link href="/legal/privacy" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
