import { SettingsView } from "@/components/settings/SettingsView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function SettingsPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/calendar" />
        <h1 className="text-xl font-semibold text-primary">Settings</h1>
      </div>
      <SettingsView />
    </PageEnter>
  );
}
