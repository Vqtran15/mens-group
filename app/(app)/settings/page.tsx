import { SettingsView } from "@/components/settings/SettingsView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function SettingsPage() {
  return (
    <PageEnter>
      <div className="p-4 pb-0">
        <BackButton href="/calendar" />
      </div>
      <SettingsView />
    </PageEnter>
  );
}
