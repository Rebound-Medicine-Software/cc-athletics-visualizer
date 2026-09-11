-- ============================================================================
-- Encrypt the "reveal password" convenience field instead of storing it
-- as plaintext.
--
-- profiles.password_hash and athletes.password_hash were never real
-- password hashes -- they're a raw copy of the actual password, kept only
-- so staff can read a client/teammate's password back later:
--   - StaffCredentialsTab.tsx's reveal button + org_admin_list_team_credentials()
--   - AthleteCredentialsTab.tsx's reveal button + "Send Consent" email
--     (which emails the literal password to the athlete)
-- Real login has never used this column -- Supabase Auth (auth.users) is a
-- separate, properly-hashed system. Flagged 3 August 2026 (Section 9),
-- unaddressed since. Josh's call, live chat 11 September 2026: keep the
-- reveal/email-password convenience (useful for low-tech clients who need a
-- password read back to them), but stop storing it in the clear. Josh also
-- asked to flag this for a check-in near project completion -- worth
-- revisiting then whether reveal-by-design is still wanted at all, vs.
-- moving fully to reset links. See framework.md Section 9.
-- ============================================================================

create extension if not exists pgcrypto;

-- One-time symmetric key, generated here and stored in Supabase Vault.
-- vault.decrypted_secrets is only readable by roles with elevated privilege
-- (service_role / SECURITY DEFINER functions) -- never by anon/authenticated
-- directly.
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'reveal_password_key') then
    perform vault.create_secret(
        encode(gen_random_bytes(32), 'hex'),
        'reveal_password_key',
        'Symmetric key for profiles.password_encrypted / athletes.password_encrypted. Not used for real login -- Supabase Auth handles that separately. See the migration this key was created in for full context.'
      );
  end if;
end $$;

alter table public.profiles add column if not exists password_encrypted bytea;
alter table public.athletes add column if not exists password_encrypted bytea;

-- Encrypt plaintext -> bytea. Safe to expose broadly: being able to call
-- this doesn't let anyone decrypt someone else's data, only encrypt their
-- own input with the shared key.
create or replace function public.encrypt_reveal_password(_plain text)
returns bytea
language plpgsql
security definer
set search_path = public
as $$
declare
  _key text;
begin
  if _plain is null or length(_plain) = 0 then
    return null;
  end if;
  select decrypted_secret into _key from vault.decrypted_secrets where name = 'reveal_password_key';
  if _key is null then
    raise exception 'reveal_password_key not found in vault';
  end if;
  return pgp_sym_encrypt(_plain, _key);
end;
$$;

revoke all on function public.encrypt_reveal_password(text) from public;
grant execute on function public.encrypt_reveal_password(text) to authenticated;

-- Decrypt bytea -> plaintext. Deliberately NOT granted to authenticated --
-- only called from inside the team/role-scoped SECURITY DEFINER functions
-- below, so decryption always happens alongside an authorization check,
-- never as a general-purpose RPC someone could point at an arbitrary blob.
create or replace function public.decrypt_reveal_password(_enc bytea)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _key text;
begin
  if _enc is null then
    return null;
  end if;
  select decrypted_secret into _key from vault.decrypted_secrets where name = 'reveal_password_key';
  if _key is null then
    raise exception 'reveal_password_key not found in vault';
  end if;
  return pgp_sym_decrypt(_enc, _key);
end;
$$;

revoke all on function public.decrypt_reveal_password(bytea) from public;

-- Backfill: encrypt any existing plaintext, then clear the plaintext column
-- so nothing is left readable at rest. This closes the gap for accounts
-- that already exist, not just new ones going forward.
update public.profiles
  set password_encrypted = public.encrypt_reveal_password(password_hash)
  where password_hash is not null and password_encrypted is null;

update public.athletes
  set password_encrypted = public.encrypt_reveal_password(password_hash)
  where password_hash is not null and password_encrypted is null;

update public.profiles set password_hash = null where password_hash is not null;
update public.athletes set password_hash = null where password_hash is not null;

-- Match the column-level lockdown the 28 July 2026 migration already put on
-- profiles.password_hash/api_key -- athletes.password_hash was missed at the
-- time (athletes wasn't in that pass' scope), which meant any authenticated
-- user with row access to an athlete could pull the raw plaintext via a
-- plain select('*') -- confirmed live in AthleteCredentialsTab.tsx's
-- fetchAthletes(). Closing both columns on both tables now.
revoke select (password_hash, password_encrypted) on public.profiles from anon, authenticated;
revoke select (password_hash, password_encrypted) on public.athletes from anon, authenticated;

-- Staff reveal: same team+role scoping org_admin_list_team_credentials()
-- already used, just decrypting instead of returning plaintext. Return
-- shape/column name (password_hash) kept identical so the frontend's read
-- path needs no changes -- only the write path changes (see StaffCredentialsTab.tsx).
create or replace function public.org_admin_list_team_credentials()
returns table (
    id uuid,
    user_id uuid,
    email text,
    full_name text,
    role text,
    password_hash text
  )
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.user_id, p.email, p.full_name, p.role,
         public.decrypt_reveal_password(p.password_encrypted) as password_hash
  from public.profiles p
  where p.team_id = public.get_my_team_id()
    and public.get_my_role() = any (array['organisation','super_admin']);
$$;

revoke all on function public.org_admin_list_team_credentials() from public;
grant execute on function public.org_admin_list_team_credentials() to authenticated;

-- Athlete reveal: same shape/pattern, new function -- AthleteCredentialsTab.tsx
-- previously read athletes.password_hash directly off a select('*') with no
-- RPC at all (see the revoke above for why that path is now closed). Role
-- check matches org_admin_list_team_credentials() exactly (organisation,
-- super_admin) -- can_access_team_row() alone only scopes by team, not role.
create or replace function public.list_team_athlete_credentials()
returns table (
    id uuid,
    password_hash text
  )
language sql
stable
security definer
set search_path = public
as $$
  select a.id,
         public.decrypt_reveal_password(a.password_encrypted) as password_hash
  from public.athletes a
  where public.can_access_team_row(a.team_id)
    and public.get_my_role() = any (array['organisation','super_admin']);
$$;

revoke all on function public.list_team_athlete_credentials() from public;
grant execute on function public.list_team_athlete_credentials() to authenticated;
