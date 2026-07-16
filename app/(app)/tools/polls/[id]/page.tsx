import { PollDetailView } from "@/components/tools/polls/PollDetailView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools/polls" />
      </div>
      <PollDetailView pollId={id} />
    </PageEnter>
  );
}
