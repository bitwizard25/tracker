import { cn } from "@/lib/cn";

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <span role={label ? "status" : undefined} aria-label={label} className="inline-flex">
      <span
        aria-hidden="true"
        className={cn(
          "inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent",
          className,
        )}
      />
    </span>
  );
}
