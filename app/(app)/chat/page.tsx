import { ChatView } from "@/components/chat/ChatView";
import { PageEnter } from "@/components/ui/PageEnter";

export default function ChatPage() {
  return (
    <PageEnter className="flex h-full flex-col">
      <ChatView />
    </PageEnter>
  );
}
