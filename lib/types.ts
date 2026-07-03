export interface Profile {
  id: string;
  display_name: string;
  email: string;
  created_at: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface TopicNote {
  id: string;
  topic_id: string;
  body: string;
  created_by: string;
  created_at: string;
  profiles?: Pick<Profile, "display_name">;
}

export interface MeetingSchedule {
  id: string;
  label: string;
  day_of_week: number;
  occurrences_in_month: number[];
  time_of_day: string;
  duration_minutes: number;
  location: string | null;
  notes: string | null;
  active: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  created_by: string;
  is_recurring: boolean;
  schedule_id: string | null;
  created_at: string;
}

export type RsvpStatus = "yes" | "no" | "maybe";

export interface Rsvp {
  id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "display_name">;
}

export interface ChatMessage {
  id: string;
  body: string;
  created_by: string;
  created_at: string;
  profiles?: Pick<Profile, "display_name">;
}
