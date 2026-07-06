import { DraftsView } from "@/components/topics/DraftsView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function DraftsPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/topics" />
        <h1 className="text-xl font-semibold text-primary">Drafts</h1>
      </div>
      <DraftsView />
    </PageEnter>
  );
}
