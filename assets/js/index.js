/* index.js – Startseite: Anmelden/Registrieren, Pool anlegen/beitreten, "Meine Tipps" */
(function () {
  "use strict";
  const { $, el, toast, copy, getParam, fmtDateTime } = window.UI;
  const Auth = window.Auth;
  const baseUrl = location.href.split("?")[0];

  let mode = "login"; // "login" | "register"

  // ============ Ansicht umschalten (eingeloggt vs. nicht) ============
  function showApp(username) {
    $("#auth-section").classList.add("hidden");
    $("#app-section").classList.remove("hidden");
    $("#me-name").textContent = username || "";
  }
  function showAuth() {
    $("#app-section").classList.add("hidden");
    $("#auth-section").classList.remove("hidden");
  }

  // ============ Anmelden / Registrieren ============
  function setMode(m) {
    mode = m;
    const isReg = m === "register";
    $("#auth-pw2-wrap").classList.toggle("hidden", !isReg);
    $("#auth-submit").textContent = isReg ? "Konto erstellen" : "Anmelden";
    $("#auth-hint").textContent = isReg
      ? "Wähle einen Benutzernamen (3–40 Zeichen) und ein Passwort (mind. 8 Zeichen)."
      : "Melde dich an, um deine Tipps und Punkte auf jedem Gerät wiederzufinden.";
    $("#auth-pw").setAttribute("autocomplete", isReg ? "new-password" : "current-password");
    // aktiven Tab hervorheben
    $("#tab-login").className = "flex-1 rounded-lg px-3 py-2 text-sm font-semibold " +
      (isReg ? "bg-slate-100 text-slate-700" : "bg-blue-600 text-white");
    $("#tab-register").className = "flex-1 rounded-lg px-3 py-2 text-sm font-semibold " +
      (isReg ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700");
  }

  async function submitAuth() {
    const user = ($("#auth-user").value || "").trim();
    const pw = $("#auth-pw").value || "";
    if (!user) return toast("Bitte Benutzernamen eingeben.", "err");
    if (!pw) return toast("Bitte Passwort eingeben.", "err");
    if (mode === "register") {
      if (pw.length < 8) return toast("Passwort muss mindestens 8 Zeichen lang sein.", "err");
      if (pw !== ($("#auth-pw2").value || "")) return toast("Die Passwörter stimmen nicht überein.", "err");
    }
    const btn = $("#auth-submit");
    btn.disabled = true; btn.textContent = mode === "register" ? "Erstelle Konto …" : "Melde an …";
    try {
      const r = mode === "register"
        ? await window.DB.register(user, pw)
        : await window.DB.login(user, pw);
      Auth.set(r);
      $("#auth-pw").value = ""; if ($("#auth-pw2")) $("#auth-pw2").value = "";
      showApp(r.username);
      await afterLogin();
    } catch (e) {
      toast(e.message, "err");
    } finally {
      btn.disabled = false; setMode(mode);
    }
  }

  async function logout() {
    const t = Auth.token();
    Auth.clear();
    showAuth(); setMode("login");
    try { if (t) await window.DB.logout(t); } catch (e) { /* egal – lokal sind wir schon abgemeldet */ }
  }

  // ============ Beitreten ============
  async function join() {
    const code = ($("#join-code").value || "").trim().toUpperCase();
    if (!code) return toast("Bitte Pool-Code eingeben.", "err");
    const token = Auth.token();
    if (!token) return toast("Bitte zuerst anmelden.", "err");
    const btn = $("#join-btn");
    btn.disabled = true; btn.textContent = "Trete bei …";
    try {
      const r = await window.DB.joinPool(token, code);
      location.href = "bracket.html?pool=" + encodeURIComponent(r.pool_id);
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false; btn.textContent = "Beitreten & tippen";
    }
  }

  // ============ Anlegen ============
  async function create() {
    const name = ($("#create-name").value || "").trim();
    if (!name) return toast("Bitte einen Namen für die Tipprunde eingeben.", "err");
    const btn = $("#create-btn");
    btn.disabled = true; btn.textContent = "Erstelle …";
    try {
      const r = await window.DB.createPool(name);
      const joinLink = baseUrl + "?join=" + r.join_code;
      const box = $("#create-result");
      box.innerHTML = "";
      box.classList.remove("hidden");
      box.appendChild(el("div", { class: "font-bold text-emerald-800 mb-1", text: "Pool erstellt! 🎉" }));
      box.appendChild(el("div", { class: "mb-2" }, [
        "Pool-Code: ",
        el("span", { class: "font-mono font-bold text-base tracking-widest", text: r.join_code }),
      ]));
      box.appendChild(el("div", { class: "text-slate-600 break-all mb-3", text: joinLink }));
      box.appendChild(el("div", { class: "flex gap-2 flex-wrap" }, [
        el("button", { class: "bg-blue-600 text-white rounded px-3 py-1.5 text-sm", text: "Link kopieren",
          onClick: () => copy(joinLink) }),
        el("button", { class: "bg-slate-200 rounded px-3 py-1.5 text-sm", text: "Jetzt selbst beitreten",
          onClick: () => { $("#join-code").value = r.join_code; $("#join-code").scrollIntoView({ behavior: "smooth", block: "center" }); } }),
      ]));
      btn.disabled = false; btn.textContent = "Pool erstellen";
      $("#create-name").value = "";
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false; btn.textContent = "Pool erstellen";
    }
  }

  // ============ "Meine Tipps" ============
  async function renderMine() {
    const host = $("#my-list");
    host.innerHTML = "";
    let pools = [];
    try { pools = await window.DB.myPools(Auth.token()); }
    catch (e) { toast(e.message, "err"); }
    if (!pools || !pools.length) { $("#my-empty").classList.remove("hidden"); return; }
    $("#my-empty").classList.add("hidden");
    pools.forEach((p) => {
      const card = el("div", { class: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm" });
      card.appendChild(el("div", { class: "font-bold", text: p.pool_name || "Tipprunde" }));
      const status = p.locked
        ? "Tippabgabe beendet"
        : (p.has_payload ? "Tipp gesetzt – noch änderbar" : "Tipp noch offen");
      card.appendChild(el("div", { class: "text-sm text-slate-500 mb-3" }, [
        status + " · " + (p.participant_count || 1) + " Teilnehmer",
      ]));
      card.appendChild(el("div", { class: "flex gap-2 flex-wrap" }, [
        el("a", { href: "bracket.html?pool=" + encodeURIComponent(p.pool_id),
          class: "bg-blue-600 text-white rounded px-3 py-1.5 text-sm",
          text: p.locked ? "Tipp ansehen" : "Tipp bearbeiten" }),
        el("a", { href: "pool.html?pool=" + encodeURIComponent(p.pool_id),
          class: "bg-slate-200 rounded px-3 py-1.5 text-sm", text: "Pool & Rangliste" }),
      ]));
      host.appendChild(card);
    });
  }

  // ============ Nach erfolgreichem Login ============
  async function afterLogin() {
    await renderMine();
    // Falls die Seite über einen Einladungslink (?join=CODE) geöffnet wurde:
    const pre = getParam("join");
    if (pre) {
      $("#join-code").value = pre.toUpperCase();
      try {
        const p = await window.DB.getPoolByCode(pre);
        const lbl = $("#join-pool-name");
        lbl.textContent = "Du trittst bei: " + p.name + " · Deadline " + fmtDateTime(p.lock_at);
        lbl.classList.remove("hidden");
      } catch (e) { /* Code evtl. ungültig – Nutzer sieht Fehler beim Beitreten */ }
      $("#join-code").focus();
    }
  }

  // ============ Init ============
  async function init() {
    // Auth-UI
    $("#tab-login").addEventListener("click", () => setMode("login"));
    $("#tab-register").addEventListener("click", () => setMode("register"));
    $("#auth-submit").addEventListener("click", submitAuth);
    $("#logout-btn").addEventListener("click", logout);
    // Enter im Passwortfeld sendet ab
    [$("#auth-user"), $("#auth-pw")].forEach((inp) =>
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") submitAuth(); }));
    if ($("#auth-pw2")) $("#auth-pw2").addEventListener("keydown", (ev) => { if (ev.key === "Enter") submitAuth(); });
    setMode("login");

    // App-UI
    $("#join-btn").addEventListener("click", join);
    $("#create-btn").addEventListener("click", create);

    // Bestehende Session prüfen
    const sess = Auth.get();
    if (sess && sess.token) {
      try {
        const u = await window.DB.sessionUser(sess.token); // validiert Token serverseitig
        Auth.set({ token: sess.token, user_id: u.user_id, username: u.username });
        showApp(u.username);
        await afterLogin();
        return;
      } catch (e) {
        Auth.clear(); // Token ungültig/abgelaufen
      }
    }
    showAuth();
    // Einladungslink schon ins Feld legen (wird nach Login genutzt)
    const pre = getParam("join");
    if (pre) $("#auth-hint").textContent = "Melde dich an oder erstelle ein Konto, um dem Pool beizutreten.";
  }

  document.addEventListener("DOMContentLoaded", init);
})();
