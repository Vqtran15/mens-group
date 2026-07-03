import { EventForm } from "@/components/calendar/EventForm";

export default function NewEventPage() {
  return (
    <div>
      <h1 className="p-4 pb-0 text-xl font-semibold text-primary">Add event</h1>
      <EventForm />
    </div>
  );
}
