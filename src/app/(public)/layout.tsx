import { PublicNavbar } from "@/components/layout/PublicNavbar";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PublicNavbar />
      <main id="main" tabIndex={-1}>{children}</main>
    </div>
  );
}
