# Supabase swap plan (not implemented in the Oct 30 build)

The demo runs on `LocalRepo` (zustand store persisted to `localStorage`). Production swaps in a `SupabaseRepo`
that implements the **same** `Repo` interface in `src/lib/db/repo.ts`, so no screen changes.

## Mapping

| Local (`DbState`) | Postgres | Notes |
|---|---|---|
| `users` | `public.users` | snake_case columns match `User` in `src/lib/types.ts`. `phone` readable only by self. |
| `identities` | `private.user_identities` | Separate schema, `pgcrypto` column encryption, RLS: readable only by the `placement` service role. Never joined into member views. |
| `interests`, `userInterests` | `interests`, `user_interests` | |
| `pods`, `memberships` | `pods`, `memberships` | RLS: members read their pods; admins (≤2) update name/photo. |
| `hangouts`, `suggestions`, `rsvps`, `votes`, `runItBack` | same names | `run_it_back.responses` is never selectable by members; a view exposes the tally only when yes ≥ 4. |
| `messages` | `messages` | Realtime channel per pod replaces `BroadcastChannel`. |
| `reports`, `blocks`, `adminActions`, `banned` | same names | `banned` stores HMAC-SHA256 hashes (server secret). |
| `venues`, `verifications`, `waitlist`, `placementRuns`, `notifications` | same names | Verification images never touch Pods servers (vendor SDK uploads direct). |
| `config` | `app_config` (single row, versioned) | Admin edits write `admin_actions`. |
| `clock`, `plannerCache` | n/a | Demo only. |

## SQL sketch

```sql
create schema if not exists private;
create table public.users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null, nickname text, pronouns text, bio text check (char_length(bio) <= 150),
  prompts jsonb not null default '[]', photo_urls text[] not null default '{}',
  date_of_birth date not null, city text not null check (city in ('Huntsville','Madison','Decatur')),
  phone text not null unique, verified boolean not null default false, verified_at timestamptz,
  availability text[] not null default '{}', blocked_days text[] not null default '{}',
  status text not null default 'onboarding', created_at timestamptz not null default now()
);
create table private.user_identities (
  user_id uuid primary key references public.users(id) on delete cascade,
  heritage bytea, faith bytea,           -- pgp_sym_encrypt(json, current_setting('app.identity_key'))
  consent_given_at timestamptz not null
);
alter table private.user_identities enable row level security;
-- only the placement service role may read:
create policy placement_only on private.user_identities for select to placement_service using (true);
```

## Steps
1. `SupabaseRepo` in `src/lib/db/supabase/index.ts`, same method names; `useRepo()` picks it when `NEXT_PUBLIC_SUPABASE_URL` is set.
2. Authorization checks currently inside `LocalRepo` modules become RLS policies.
3. Edge Function `plan` replaces `/api/plan` (same NDJSON events).
4. Realtime replaces `BroadcastChannel("pods")`.
