import { ConvertDraftForm } from "@/components/topics/ConvertDraftForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function ConvertDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/topics/drafts" />
        <h1 className="text-xl font-semibold text-primary">Convert to topic</h1>
      </div>
      <ConvertDraftForm draftId={id} />
    </PageEnter>
  );
}
