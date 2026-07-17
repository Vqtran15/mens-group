import { PollsView } from "@/components/tools/polls/PollsView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function PollsPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools" />
        <h1 className="text-xl font-semibold text-primary">Polls</h1>
      </div>
      <PollsView />
    </PageEnter>
  );
}
