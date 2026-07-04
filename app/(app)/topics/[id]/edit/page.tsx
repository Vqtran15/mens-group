import { TopicEditForm } from "@/components/topics/TopicEditForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function EditTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href={`/topics/${id}`} />
        <h1 className="text-xl font-semibold text-primary">Edit topic</h1>
      </div>
      <TopicEditForm topicId={id} />
    </PageEnter>
  );
}
