import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LeaderboardEntry } from "@/lib/types";

export const MAX_COMPARED = 5;

type CompareControlsProps = {
  candidates: LeaderboardEntry[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
};

/** Lets the viewer pick which sharing users to compare with. Nothing selected keeps the default. */
export function CompareControls({ candidates, selectedIds, onChange }: CompareControlsProps) {
  const others = candidates.filter((c) => !c.isYou);
  if (others.length === 0) return null;
  const full = selectedIds.length >= MAX_COMPARED;

  function toggle(userId: number) {
    onChange(
      selectedIds.includes(userId)
        ? selectedIds.filter((id) => id !== userId)
        : [...selectedIds, userId],
    );
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">Compare with</legend>
      <p className="text-xs text-muted" id="compare-help">
        {selectedIds.length === 0
          ? "Showing the current top members. Pick up to 5 to choose your own."
          : `${selectedIds.length} of ${MAX_COMPARED} selected.`}
      </p>
      <ul className="flex flex-wrap gap-2">
        {others.map((entry) => {
          const checked = selectedIds.includes(entry.userId);
          const disabled = !checked && full;
          return (
            <li key={entry.userId}>
              <label
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm",
                  "has-[:checked]:border-brand has-[:checked]:bg-brand-soft",
                  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                  disabled && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
                  checked={checked}
                  disabled={disabled}
                  aria-describedby="compare-help"
                  onChange={() => toggle(entry.userId)}
                />
                {entry.displayName}
              </label>
            </li>
          );
        })}
      </ul>
      {selectedIds.length > 0 && (
        <Button variant="ghost" className="min-h-9 self-start px-3" onClick={() => onChange([])}>
          Reset to top members
        </Button>
      )}
    </fieldset>
  );
}
