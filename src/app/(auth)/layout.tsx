import type { ReactNode } from "react";
import { AppFooter } from "@/components/layout/AppFooter";
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-10">
        <div className="text-center">
          <p className="font-display text-3xl font-semibold text-brand-strong">
            Steady
          </p>
          <p className="mt-1 text-sm text-muted">
            Small daily check-ins. Real progress.
          </p>
        </div>
        {children}
      </main>
      <AppFooter />
    </>
  );
}
