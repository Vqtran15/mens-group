import { PotluckForm } from "@/components/tools/potluck/PotluckForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function NewPotluckPage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/tools/potluck" />
        <h1 className="text-xl font-semibold text-primary">New potluck</h1>
      </div>
      <PotluckForm />
    </PageEnter>
  );
}
