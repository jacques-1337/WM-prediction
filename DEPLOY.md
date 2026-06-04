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
