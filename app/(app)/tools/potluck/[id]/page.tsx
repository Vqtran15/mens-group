import { PotluckDetailView } from "@/components/tools/potluck/PotluckDetailView";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function PotluckDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools/potluck" />
      </div>
      <PotluckDetailView potluckId={id} />
    </PageEnter>
  );
}
