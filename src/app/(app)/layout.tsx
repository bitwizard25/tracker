import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppFooter } from "@/components/layout/AppFooter";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  if (!cookieStore.has("tracker_session")) redirect("/login");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
      <AppFooter />
    </>
  );
}
