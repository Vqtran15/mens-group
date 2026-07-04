-- Lets users pick a fixed avatar color in Settings instead of always
-- deriving it from a hash of their name. Null falls back to the hash-based
-- color, so existing users are unaffected until they choose one.
alter table public.profiles add column avatar_color text;
