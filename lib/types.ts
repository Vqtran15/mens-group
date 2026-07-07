export interface Profile {
  id: string;
  display_name: string;
  email: string;
  group_id: string | null;
  avatar_color: string | null;
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
}

export interface Topic {
  id: string;
  title: string;
  description: string | null;
  topic_date: string;
  created_by: string;
  group_id: string;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_color">;
}

export interface TopicDraft {
  id: string;
  title: string;
  description: string | null;
  created_by: string;
  group_id: string;
  created_at: string;
  updated_at: string;
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
  group_id: string;
  skipped_dates: string[];
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
  group_id: string;
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
  profiles?: Pick<Profile, "display_name" | "avatar_color">;
}

export interface ChatMessage {
  id: string;
  body: string;
  created_by: string;
  group_id: string;
  image_urls: string[];
  reply_to_id: string | null;
  edited_at: string | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_color">;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface RelatedTopic {
  id: string;
  title: string;
}
