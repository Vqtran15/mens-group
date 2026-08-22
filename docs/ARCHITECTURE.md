# Architecture

This doc exists so a new developer (including future-you) can get oriented
without having to read all 48 migrations in order. It covers what's here,
why it's shaped this way, and where to look for more detail. It does **not**
duplicate what the code comments already explain well - where a design
decision has a good comment at its source, this doc points at the file
instead of restating it.

## What this app is

A Next.js PWA for a small recurring group (originally a men's group, but
nothing in the schema is specific to that) to run its recurring meetings:
calendar/RSVPs, group chat, discussion topics, and a few lightweight tools
(polls, a potluck sign-up list, shared resources).

- **Stack**: Next.js 16 (App Router, Turbopack), React 19, TypeScript
  (strict), Tailwind v4, Supabase (Postgres + Auth + Realtime + Storage).
- **Hosting**: Vercel, deployed from GitHub. `staging` is the default
  working branch; `main` is production. Nothing merges to `main` without an
  explicit decision to do so.
- **Database**: one Supabase project, no per-environment split (staging and
  production share the same database - see "Known gaps" below).

## Repo layout

```
app/                    Routing only - every route re-exports one component
  (app)/                Signed-in routes (calendar, chat, topics, tools, settings)
  (auth)/               sign-in / sign-up
  superadmin/            Hidden, platform-wide operator console (see "Two admin concepts")
  api/push/subscribe/    The one real API route (push subscription registration)
  sw.js/                 Service worker, served as a route so it can read request context

components/             One directory per feature area, mirrors app/
  calendar/ chat/ topics/ tools/{polls,potluck,resources}/ settings/ superadmin/
  ui/                   Generic, feature-agnostic building blocks (Button, Skeleton, ...)

lib/
  supabase/             Client factories: client.ts (browser), server.ts (RSC/Server
                         Actions), proxy.ts (middleware), admin.ts (service-role, bypasses RLS)
  admin.ts              Group-scoped admin allowlist (see "Two admin concepts")
  superadmin/           Platform-wide operator allowlist (see "Two admin concepts")
  scheduleMaterialization.ts / recurrence.ts   Recurring-meeting engine (see below)
  types.ts              Hand-written types mirroring the DB schema (see "Known gaps")

supabase/
  migrations/           The actual source of truth for the schema - applied by hand,
                         see "How schema changes get applied" below
  functions/             Three Deno edge functions, all push-notification senders
```

Every route component follows the same shape: `app/.../page.tsx` is a thin
wrapper that renders one `"use client"` component from `components/`, which
owns its own data fetching (no server-side data loading via RSC props -
this app doesn't use that pattern anywhere). That's a deliberate
simplification, not an oversight: it keeps every feature's logic in one
file instead of split across a server component and a client component.

## Data model

Everything hangs off `groups`. A `profiles` row belongs to at most one group
(`group_id`, nullable - null means "signed up but hasn't joined/created a
group yet", see `app/onboarding`).

```
groups
  └─ profiles (group_id)
       ├─ meeting_schedule ──> events (materialized occurrences, see below)
       │                          └─ rsvps (see "RSVP durability" below)
       ├─ topics / topic_drafts
       ├─ chat_messages ──> message_reactions
       ├─ polls ──> poll_options ──> poll_votes
       ├─ potluck_items
       └─ resources
```

Every one of these content tables carries `group_id` and is scoped to it via
RLS (`group_id = (select group_id from profiles where id = auth.uid())`) -
there is no other tenant-isolation mechanism, and there doesn't need to be.
**RLS is the actual authorization boundary in this app, not a UI
convention.** Client components call `supabase.from(...)` directly for
almost everything; the policies are what make that safe. When you add a new
table or a new mutation, the question to ask is "what does the RLS policy
allow", not "what does the UI prevent" - the UI should mirror the policy for
UX, but never be the only thing enforcing it.

### Recurring meetings and RSVP durability

This is the most subtle part of the schema, and the one most likely to trip
up a change if you don't know the history:

- `meeting_schedule` holds the *recurrence rule* (day of week, time,
  duration, timezone, skipped dates) - not individual occurrences.
- `lib/scheduleMaterialization.ts` reconciles that rule into actual `events`
  rows on every Calendar load, matching by *calendar date in the schedule's
  timezone*, never by exact timestamp. Read the doc comment at the top of
  that file before touching it - it explains exactly which changes are safe
  (update in place) versus which force a row to be archived.
- `rsvps` are keyed by `(schedule_id, occurrence_date)`, **not** by
  `event_id`. This is the fix for a real incident: RSVPs used to live and
  die with their `events` row, so any materialization churn (a schedule
  edit, a skip, a timezone bug) could silently delete them. Now, when an
  occurrence's `events` row goes away (skipped, or genuinely stale), a
  trigger detaches the RSVP (`event_id → null`) instead of losing it; when
  that occurrence's row comes back, `reattach_occurrence_rsvps()` (a
  `SECURITY DEFINER` RPC, not a direct policy - a plain UPDATE can't do this
  because the RSVP being reattached usually isn't the current user's own
  row) reattaches it. See `0041_rsvp_stable_occurrence_key.sql`.

If you're adding a feature that touches events or RSVPs, read that
migration and `scheduleMaterialization.ts` first. The failure mode this
protects against (RSVPs quietly vanishing) already happened once.

### Archive instead of delete

Nearly every "delete" in this app (`events`, `topics`, `topic_drafts`,
`polls`, `poll_options`, `resources`, `potluck_items`, `chat_messages`) is
actually `UPDATE ... SET archived_at = now()`, and every list/read query
filters with `.is("archived_at", null)`. Client-side hard `DELETE` is
blocked by RLS on all of these tables (`0045_block_client_delete_on_archived_tables.sql`)
- the only thing that ever hard-deletes a row is `purge_archived_content()`,
a `SECURITY DEFINER` SQL function on a daily `pg_cron` schedule that removes
anything archived more than 30 days ago (`0044_purge_archived_after_30_days.sql`).

If you add a new content table that users can "delete," follow this same
pattern (`archived_at` column, RLS blocks DELETE, add it to the purge
function's table list) rather than allowing a real DELETE.

### Two admin concepts (don't confuse them)

- **`lib/admin.ts`** - a small, per-app allowlist of *group-scoped* trusted
  members (currently the two `vqtran15+...` accounts). Checked all over the
  regular app UI (`CalendarView`, `MeetingScheduleForm`, `PollDetailView`,
  `PotluckView`) to gate things like editing the recurring schedule or
  closing someone else's poll. Enforced server-side by
  `public.is_admin_email()` in RLS, not just in the UI.
- **`lib/superadmin/`** - a completely separate, hidden, platform-wide
  operator console at `/superadmin` (not linked from any nav - reachable
  only by knowing the URL), gated to one personal email. It can see and
  manage *every* group, not just one, via a service-role client
  (`lib/supabase/admin.ts`) that bypasses RLS entirely.

These two used to share the literal name "admin" across files and even an
identically-named exported function, which made it easy to import the
wrong one. They're now named distinctly (`isAdminEmail` vs
`isSuperadminEmail`) specifically so that mistake fails loudly (wrong
import, wrong behavior) instead of silently.

### Realtime gotcha

A table needs **two** things before `supabase.channel(...).on("postgres_changes", ...)`
will ever fire for it:

1. It must be added to the `supabase_realtime` publication
   (`alter publication supabase_realtime add table public.<table>;`).
2. The subscribing user's session must pass that table's RLS `SELECT`
   policy for the row in question.

Missing (1) is a silent no-op - no error, the subscription just never
fires. This bit the inline poll-voting and potluck cards in chat (`0047`,
`0048`) after they were fully built and tested locally: `chat_messages`,
`message_reactions`, and `topics` had this from earlier migrations, but
`polls`/`poll_options`/`poll_votes`/`potluck_items` never did, since nothing
had needed them live before. **If you add realtime to a new table, add the
publication migration in the same PR as the feature**, or it'll look like
the feature works (initial load is fine) right up until you test a second
client.

## How schema changes get applied

There is no local Supabase stack (no `supabase/config.toml`, no seed data).
Every migration in `supabase/migrations/` is applied directly against the
one linked (shared staging+production) Supabase project:

```
npx supabase db query --file supabase/migrations/NNNN_name.sql --linked
```

`npx supabase db push` does **not** work here - this project's local
migration-tracking table was never synced with the remote, so it tries to
replay the entire history from the beginning and fails on already-applied
changes. Use `db query --file` for anything new.

This is a real gap (see "Known gaps"), not a preference - it means there's
no way to try a migration against a disposable database before it hits the
shared one, and no automated way to verify a migration + its RLS policies
actually do what they're supposed to before shipping. The mitigation used
so far has been manual verification: simulate the policy directly with
`set local role authenticated; set local request.jwt.claims = '...'`
against a throwaway account before treating a migration as done.

## Auth & session handling

`lib/supabase/proxy.ts` (wired up via the root `proxy.ts`) runs on every
request and uses `getSession()`, not `getUser()`, to decide whether to
redirect to `/sign-in`. `getSession()` reads from cookies with no network
call in the common case; `getUser()` revalidates against Supabase's Auth
server on every single request, which was previously blocking the entire
HTML response (including the splash screen) behind a network round trip.
This is a deliberate, documented tradeoff (see the comment in that file) -
`getSession()` doesn't cryptographically re-verify the token, but that's
fine here because this check only ever makes a redirect/UX decision. RLS is
still what actually protects the data, regardless of what a forged cookie
could get past this middleware.

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_VAPID_PUBLIC_KEY     # web push
SUPABASE_SERVICE_ROLE_KEY        # server-only; powers lib/supabase/admin.ts
```

`next build` doesn't need any of these to succeed - every Supabase client
in this app is created lazily at request time, never at build time - which
is why CI (`.github/workflows/ci.yml`) doesn't configure any secrets.

## If you're new here, read in this order

1. `lib/supabase/current-membership.ts` - the one function almost every
   component calls first (`{ userId, groupId, email }`).
2. `0035_tools.sql` and `components/tools/potluck/PotluckView.tsx` - the
   simplest full vertical slice (table → RLS → view), good template for how
   a feature is structured end to end.
3. `0041_rsvp_stable_occurrence_key.sql` + `lib/scheduleMaterialization.ts`
   - the most important piece of non-obvious design in the app.
4. `0043`–`0046` in order - archive/purge, then the permission tightening
   built on top of it. Shows how this schema evolves incrementally rather
   than via big-bang rewrites.
5. `components/chat/ChatView.tsx` - the largest, most feature-dense
   component (realtime sync, optimistic sends, reactions, replies,
   editing). Not the place to start making changes, but worth reading once
   to see the realtime subscription pattern used throughout.

## Known gaps

Tracked here rather than left implicit, so they read as "known and
deliberately not yet done" rather than "nobody noticed":

- **No automated tests.** All verification (RLS behavior, realtime sync,
  permission gating) has been done by hand, per change, against the live
  linked database with throwaway accounts. Nothing regresses automatically.
- **No local dev database.** See "How schema changes get applied" above -
  this is also what blocks writing real migration/RLS tests.
- **`lib/types.ts` is hand-maintained**, not generated from the schema
  (`supabase gen types typescript` isn't wired up anywhere). It can drift
  from the actual database silently - TypeScript has no way to catch a
  mismatch here.
- **Staging and production share one Supabase project/database.** There's
  no environment split at the data layer, only at the Vercel/branch level.
- **Mutations mostly don't surface errors to the user.** A rejected write
  (RLS denial, network failure) typically fails silently rather than
  showing feedback - something to watch especially now that several
  actions are permission-gated (poll/potluck editing) where a stale UI
  could show a control that then silently fails.
- **Polls, Potluck, and Resources share a lot of near-duplicate logic**
  (load-with-archive-filter, archive-instead-of-delete, share-to-chat,
  creator/admin permission gate) implemented three separate times rather
  than through a shared abstraction.
