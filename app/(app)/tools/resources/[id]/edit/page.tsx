import { ResourceForm } from "@/components/tools/resources/ResourceForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools/resources" />
        <h1 className="text-xl font-semibold text-primary">Edit resource</h1>
      </div>
      <ResourceForm resourceId={id} />
    </PageEnter>
  );
}
