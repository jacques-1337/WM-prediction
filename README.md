# WM 2026 Tippspiel 🏆

Eine kleine Web-App, mit der du und deine Freunde die **Fußball-WM 2026** tippt –
im Stil eines Bracket-Predictors: komplette Gruppenphase, alle K.-o.-Runden bis zum
Weltmeister, mit **Pools, geheimer Tippabgabe bis zum Anpfiff und automatischer Rangliste**.

- **Frontend:** statisches HTML + Tailwind (Play-CDN) + Vanilla-JS – **kein Build nötig**.
- **Backend:** [Supabase](https://supabase.com) (Postgres + RLS + SQL-Funktionen).
- **Anmeldung:** Name + Pool-Code, **kein Passwort**. Bearbeiten über einen privaten Link mit Geheim-Token.

## Lokal starten

Im Projektordner:

```bash
py -m http.server 8000
```

Dann im Browser öffnen: <http://127.0.0.1:8000/index.html>

Das Frontend spricht direkt mit der Supabase-Cloud – lokal testen und „echte" Cloud
nutzen also gleichzeitig. Zum Tippen kein Login nötig.

## Seiten

| Seite          | Zweck |
|----------------|-------|
| `index.html`   | Pool anlegen / per Code beitreten, „Meine Tipps" |
| `bracket.html` | Tipp ausfüllen (Gruppen sortieren, 8 Dritte wählen, K.-o.-Sieger klicken) – Auto-Speichern |
| `pool.html`    | Teilnehmer; **ab Anpfiff** alle Tipps + Rangliste |
| `admin.html`   | Echte Ergebnisse eintragen (mit Admin-Passwort) |

## So funktioniert es

1. **Pool anlegen** → du bekommst einen 6-stelligen Code + Einladungslink.
2. Freunde öffnen den Link, geben ihren **Namen** ein und füllen ihr Bracket aus.
   Jeder bekommt einen **privaten Bearbeiten-Link** (im Browser gespeichert), um seinen
   Tipp jederzeit – bis zum Anpfiff – zu ändern.
3. **Bis zum Anpfiff (11.06.2026)** sind fremde Tipps verborgen. Danach werden alle Tipps
   und die **Rangliste** sichtbar; Bearbeiten ist gesperrt.
4. Während des Turniers trägst du auf `admin.html` die **echten Ergebnisse** ein – die
   Punkte/Rangliste aktualisieren sich automatisch.

## Punkteregeln (in `assets/js/data.js` → `SCORING` frei änderbar)

| Kategorie | Punkte |
|-----------|--------|
| Gruppensieger korrekt | 3 |
| Gruppenzweiter korrekt | 2 |
| Weitergekommener Gruppendritter korrekt | 1 |
| Team erreicht Achtelfinale | 1 |
| Team erreicht Viertelfinale | 2 |
| Team erreicht Halbfinale | 4 |
| Team erreicht Finale | 6 |
| Weltmeister korrekt | 10 |

Gewertet wird je Runde über die **Menge der Teams**, die sie erreichen (Tipp vs. Realität).

## Konfiguration

- **Supabase-Zugang:** `assets/js/supabase.js` (Projekt-URL + öffentlicher Key – darf öffentlich sein).
- **Admin-Passwort:** liegt nur in der Datenbank (`wm_config.admin_secret`), **nicht** im Code.
  Ändern per SQL:
  ```sql
  update wm_config set value = 'NEUES_PASSWORT' where key = 'admin_secret';
  ```
- **Tipp-Deadline pro Pool:** Spalte `wm_pools.lock_at` (Standard = Anpfiff). Zum Testen
  z. B. in die Vergangenheit setzen, um Rangliste/Lock zu sehen.

## Datenmodell (Supabase, Präfix `wm_`)

`wm_teams`, `wm_pools`, `wm_participants`, `wm_participant_secrets` (Tokens, privat),
`wm_predictions` (Tipp als JSONB), `wm_results` (echte Ergebnisse, global), `wm_config`.
Schreibzugriffe laufen ausschließlich über SQL-Funktionen (`wm_join_pool`,
`wm_save_prediction`, `wm_set_results` …, alle Token-/Passwort-geschützt). Lesen fremder
Tipps ist per RLS erst **ab `lock_at`** erlaubt.

## Tests

```bash
node tests/node-check.js
```
Prüft Dritte-Zuordnung, Baum-Vollständigkeit und Wertung ohne Browser.

## Deployment

Siehe [DEPLOY.md](DEPLOY.md) (Netlify, an dieses GitHub-Repo gekoppelt).

## Hinweise / Grenzen

- Die genauen **Gruppendaten** stammen aus der Auslosung; falls ein Team falsch ist,
  in `data.js` **und** Tabelle `wm_teams` korrigieren.
- Der Turnierbaum ist vollständig nach dem **offiziellen FIFA-Spielplan** verdrahtet
  (Sechzehntel-/Achtel-/Viertel-/Halbfinale/Finale, Match 73–104) in `data.js` → `BRACKET`.
