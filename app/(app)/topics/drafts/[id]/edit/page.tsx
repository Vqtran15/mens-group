import { DraftForm } from "@/components/topics/DraftForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function EditDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/topics/drafts" />
        <h1 className="text-xl font-semibold text-primary">Edit draft</h1>
      </div>
      <DraftForm draftId={id} />
    </PageEnter>
  );
}
