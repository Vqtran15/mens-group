import { TopicDetailView } from "@/components/topics/TopicDetailView";

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TopicDetailView topicId={id} />;
}
