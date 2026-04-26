/**
 * @file Layout for the authenticated /me/* section.
 *
 * Renders the public TopNav + a settings sidebar. `requireUser` runs
 * here to guard every nested route in one place.
 */

import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { SettingsSidebar } from "@/components/layout/settings-sidebar";
import { requireUser } from "@/lib/auth";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser();
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav session={session} />
      <main className="flex-1 container mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="md:sticky md:top-24 md:self-start">
          <SettingsSidebar />
        </aside>
        <section>{children}</section>
      </main>
      <Footer />
    </div>
  );
}
