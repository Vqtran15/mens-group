import { PollForm } from "@/components/tools/polls/PollForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function NewPollPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools/polls" />
        <h1 className="text-xl font-semibold text-primary">New poll</h1>
      </div>
      <PollForm />
    </PageEnter>
  );
}
