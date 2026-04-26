/**
 * @file Layout for the public, browsable section of the site.
 */

import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { getOptionalSession } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getOptionalSession();
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav session={session} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
