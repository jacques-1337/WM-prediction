-- ============================================================================
-- fix-rls.sql — behebt: Rangliste leer / "permission denied for table wm_pools"
--
-- Symptom:  pool.html zeigt nach dem Anpfiff keine Tipps der Teilnehmer.
--           Im Netzwerk-Tab: SELECT auf wm_predictions -> Fehler 42501
--           "permission denied for table wm_pools".
--
-- Ursache:  Die RLS-Policy auf wm_predictions prüft die Deadline per Subselect
--           auf wm_pools (lock_at <= now()). Ein Policy-Subselect läuft mit den
--           Rechten des AUFRUFERS — und die Rolle "anon" (Browser, publishable
--           Key) hat kein GRANT SELECT auf wm_pools. Damit scheitert JEDES
--           SELECT auf wm_predictions, obwohl die Deadline längst vorbei ist.
--
-- Ausführen: Supabase-Dashboard -> SQL Editor -> dieses Skript einfügen -> Run.
-- ============================================================================

-- ── Diagnose (optional) ─────────────────────────────────────────────────────
-- select policyname, cmd, qual from pg_policies
--   where tablename in ('wm_predictions', 'wm_pools');

-- ── Fix (minimal & robust): Spalten-GRANT + Zeilen-Policy ───────────────────
-- Nur die Spalten freigeben, die die Policy braucht. Andere Spalten
-- (z. B. Einladungscode, Admin-Felder) bleiben für anon unlesbar,
-- weil Spaltenrechte in Postgres pro Spalte gelten.
grant select (id, name, lock_at) on public.wm_pools to anon;

-- Falls RLS auf wm_pools aktiviert ist, braucht anon zusätzlich eine
-- Zeilen-Policy, sonst liefert der Subselect 0 Zeilen (dann kein Fehler,
-- aber weiterhin leere Rangliste). Auf einer Tabelle ohne RLS ist die
-- Policy schlicht wirkungslos — schadet also nicht.
drop policy if exists wm_pools_anon_read on public.wm_pools;
create policy wm_pools_anon_read on public.wm_pools
  for select to anon using (true);

-- Hinweis: Referenziert die wm_predictions-Policy weitere wm_pools-Spalten
-- (Fehler 42501 bleibt nach dem Fix bestehen), stattdessen breiter freigeben:
--   grant select on public.wm_pools to anon;

-- ── Alternative (härter, optional): SECURITY-DEFINER-Helfer ─────────────────
-- Ganz ohne GRANT auf wm_pools; der Helfer läuft mit Eigentümer-Rechten:
--
--   create or replace function public.wm_pool_locked(p_pool uuid)
--   returns boolean language sql stable security definer
--   set search_path = public as
--   $$ select exists (select 1 from wm_pools where id = p_pool and lock_at <= now()) $$;
--   revoke all on function public.wm_pool_locked(uuid) from public;
--   grant execute on function public.wm_pool_locked(uuid) to anon;
--
-- Danach die bestehende SELECT-Policy auf wm_predictions (Name siehe
-- pg_policies-Diagnose oben) ersetzen durch:
--   using (public.wm_pool_locked(pool_id))

-- ── Verifikation ────────────────────────────────────────────────────────────
-- Danach muss dieser Aufruf HTTP 200 mit Daten liefern (statt 42501):
--
--   curl "https://okmkaegnshsemrfatmnr.supabase.co/rest/v1/wm_predictions?select=participant_id&limit=1" \
--     -H "apikey: <publishable key aus assets/js/supabase.js>"
--
-- Oder einfach pool.html öffnen: Die Rangliste zeigt jetzt alle Tipps.
