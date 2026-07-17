import { ResourcesView } from "@/components/tools/resources/ResourcesView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function ResourcesPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools" />
        <h1 className="text-xl font-semibold text-primary">Resource Library</h1>
      </div>
      <ResourcesView />
    </PageEnter>
  );
}
