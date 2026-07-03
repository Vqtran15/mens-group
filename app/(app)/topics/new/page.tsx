import { TopicForm } from "@/components/topics/TopicForm";

export default function NewTopicPage() {
  return (
    <div>
      <h1 className="p-4 pb-0 text-xl font-semibold text-primary">Add topic</h1>
      <TopicForm />
    </div>
  );
}
