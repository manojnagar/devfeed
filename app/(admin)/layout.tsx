/**
 * @file Layout for /admin/* — guarded by `requireAdmin`.
 */

import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav session={session} />
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="md:sticky md:top-24 md:self-start">
          <AdminSidebar />
        </aside>
        <section>{children}</section>
      </main>
      <Footer />
    </div>
  );
}
