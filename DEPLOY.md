# Deployment

Die App ist statisch – Hosting ist also denkbar einfach. Backend = Supabase (läuft schon).

## Variante A: Netlify (empfohlen, gratis)

**Per GitHub-Repo (Auto-Deploy bei jedem Push):**

1. Auf <https://app.netlify.com> einloggen → **Add new site → Import an existing project**.
2. **GitHub** wählen und das Repo `jacques-1337/WM-prediction` verbinden.
3. Build-Einstellungen:
   - **Build command:** *(leer lassen)*
   - **Publish directory:** `.`
   (steht auch in `netlify.toml`)
4. **Deploy** – fertig. Du bekommst eine URL wie `https://dein-name.netlify.app`.
5. Künftig genügt `git push` → Netlify deployt automatisch neu.

**Ohne Git (Drag & Drop):** Auf <https://app.netlify.com/drop> einfach den Projektordner
hineinziehen.

## Variante B: Eigener Linux-Server (wie das RSV-Projekt)

Projektordner nach z. B. `/var/www/wm-prediction` kopieren (rsync) und einen Nginx-Server-Block
darauf zeigen lassen. Kein Build, nur statische Dateien ausliefern. Bei Bedarf erstelle ich
Nginx-Block + Deploy-Skript + HTTPS (certbot) – sag einfach Bescheid.

## Wichtig nach dem Deployment

- Der **Einladungslink** zeigt automatisch auf die Domain, von der die Seite geladen wird
  (`…/index.html?join=CODE`) – funktioniert auf Netlify wie lokal.
- **CORS:** Supabase erlaubt Zugriffe von jeder Domain – nichts zu konfigurieren.
- **Admin-Passwort** bleibt geheim in der DB (`wm_config`). Es steht nirgends im ausgelieferten Code.
- Vor dem Anpfiff prüfen, dass `wm_pools.lock_at` korrekt steht (Standard: 11.06.2026, 18:00 UTC).

## Bekanntes Problem: leere Rangliste nach Anpfiff (Fehler 42501)

Zeigt `pool.html` nach der Deadline keine Tipps (Fehlermeldung „permission denied
for table wm_pools“), fehlt der Rolle `anon` das Leserecht auf `wm_pools`, das die
RLS-Policy von `wm_predictions` für den Deadline-Check braucht.

**Fix:** `supabase/fix-rls.sql` im Supabase-Dashboard (SQL Editor) ausführen.
Details und Verifikation stehen als Kommentare im Skript.

## Auswertung (Punkte)

- Echte Ergebnisse trägt der Admin in `admin.html` ein. **Wichtig:** Eine Gruppe
  zählt erst für die Punkte, wenn dort ihr Haken **„Gruppe gewertet“** gesetzt ist
  (verhindert, dass die Standard-Reihenfolge unausgefüllter Gruppen gewertet wird).
- Punkteregeln stehen in `assets/js/data.js` (`SCORING`): 3 Punkte pro exakt
  getipptem Gruppenplatz (1.–4.), 1 Punkt bei einem Platz daneben, 1 Punkt je
  richtigem Gruppendritten; K.-o. rundenbasiert (AF 1, VF 2, HF 4, Finale 6,
  Weltmeister 10). Maximal 222 Punkte.
