import { MeetingScheduleForm } from "@/components/calendar/MeetingScheduleForm";
import { BackButton } from "@/components/ui/BackButton";
import { PageEnter } from "@/components/ui/PageEnter";

export default function EditMeetingSchedulePage() {
  return (
    <PageEnter>
      <div className="flex items-center gap-2 p-4 pb-0">
        <BackButton href="/calendar" />
        <h1 className="text-xl font-semibold text-primary">Meeting schedule</h1>
      </div>
      <MeetingScheduleForm />
    </PageEnter>
  );
}
