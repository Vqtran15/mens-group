import { TopicDetailView } from "@/components/topics/TopicDetailView";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageEnter className="flex h-full flex-col">
      <TopicDetailView topicId={id} />
    </PageEnter>
  );
}
