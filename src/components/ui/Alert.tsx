import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "info";

const TONES: Record<Tone, string> = {
  error: "bg-danger-soft text-danger",
  info: "bg-brand-soft text-brand-strong",
};

type AlertProps = HTMLAttributes<HTMLDivElement> & { tone?: Tone };

export function Alert({ tone = "error", className, ...rest }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-xl px-4 py-3 text-sm", TONES[tone], className)}
      {...rest}
    />
  );
}
