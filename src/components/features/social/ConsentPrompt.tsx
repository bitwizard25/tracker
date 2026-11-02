import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ConsentPromptProps = {
  busy: boolean;
  error: string | null;
  onShare: () => void;
  onDismiss: () => void;
};

export function ConsentPrompt({ busy, error, onShare, onDismiss }: ConsentPromptProps) {
  return (
    <Card className="flex flex-col gap-4 border-brand/40 bg-brand-soft">
      <div>
        <h3 className="font-display text-lg font-semibold">Want to see how you compare?</h3>
        <p className="mt-1 max-w-prose text-sm">
          You are hidden from everyone else until you choose to share. If you share, other members
          will see:
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
          <li>your display name</li>
          <li>your rank on the leaderboard</li>
          <li>your % change in weight, relative to your first entry</li>
        </ul>
        <p className="mt-2 max-w-prose text-sm">
          Your actual weights are <strong>never</strong> shown. You can stop sharing any time, here
          or in Settings.
        </p>
      </div>
      {error && <Alert>{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        <Button loading={busy} onClick={onShare}>
          Share my progress
        </Button>
        <Button variant="secondary" disabled={busy} onClick={onDismiss}>
          Not now
        </Button>
      </div>
    </Card>
  );
}
