import { TopicForm } from "@/components/topics/TopicForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function NewTopicPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/topics" />
        <h1 className="text-xl font-semibold text-primary">Add topic</h1>
      </div>
      <TopicForm />
    </PageEnter>
  );
}
