import { MembersView } from "@/components/settings/MembersView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function MembersPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/settings" />
        <h1 className="text-xl font-semibold text-primary">Members</h1>
      </div>
      <MembersView />
    </PageEnter>
  );
}
