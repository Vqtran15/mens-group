import { ResourceForm } from "@/components/tools/resources/ResourceForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function NewResourcePage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools/resources" />
        <h1 className="text-xl font-semibold text-primary">Add resource</h1>
      </div>
      <ResourceForm />
    </PageEnter>
  );
}
