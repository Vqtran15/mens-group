import { EventForm } from "@/components/calendar/EventForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/calendar" />
        <h1 className="text-xl font-semibold text-primary">Edit event</h1>
      </div>
      <EventForm eventId={id} />
    </PageEnter>
  );
}
