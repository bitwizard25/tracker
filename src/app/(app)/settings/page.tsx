import { Card } from "@/components/ui/Card";
import { SharingToggle } from "@/components/features/settings/SharingToggle";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl font-semibold">Settings</h1>
      <Card>
        <SharingToggle />
      </Card>
    </div>
  );
}
