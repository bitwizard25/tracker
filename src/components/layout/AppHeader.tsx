"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { AppNav } from "@/components/layout/AppNav";

export function AppHeader() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.auth.logout();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <span className="font-display text-xl font-semibold text-brand-strong">Steady</span>
        <div className="order-3 w-full overflow-x-auto sm:order-none sm:w-auto">
          <AppNav />
        </div>
        <Button variant="ghost" onClick={logout} loading={loggingOut}>
          Log out
        </Button>
      </div>
    </header>
  );
}
