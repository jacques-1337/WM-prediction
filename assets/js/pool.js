/* pool.js – Pool-Ansicht: Teilnehmer, Rangliste, ausklappbare Tipps */
(function () {
  "use strict";
  const { $, el, toast, getParam, fmtDateTime } = window.UI;
  const Core = window.WMCore, Scoring = window.Scoring;

  const poolId = getParam("pool");

  function badge(text, cls) { return el("span", { class: "text-xs font-semibold px-2 py-1 rounded-full " + cls, text }); }

  function renderHead(pool, count) {
    const head = $("#pool-head");
    head.innerHTML = "";
    head.appendChild(el("h1", { class: "text-2xl font-extrabold text-slate-900", text: pool.name }));
    const meta = el("div", { class: "flex items-center gap-2 mt-2 flex-wrap text-sm text-slate-500" });
    meta.appendChild(pool.locked ? badge("Tippabgabe beendet", "bg-slate-200 text-slate-700")
      : badge("Tipps geheim bis Anpfiff", "bg-amber-100 text-amber-700"));
    meta.appendChild(el("span", { text: "Deadline: " + fmtDateTime(pool.lock_at) }));
    meta.appendChild(el("span", { text: "· " + count + " Teilnehmer" }));
    head.appendChild(meta);

    const mine = window.Store.byPool(poolId);
    if (mine) {
      head.appendChild(el("a", {
        href: "bracket.html?token=" + encodeURIComponent(mine.token),
        class: "inline-block mt-3 text-sm bg-blue-600 text-white rounded px-3 py-1.5",
        text: pool.locked ? "Meinen Tipp ansehen" : "Meinen Tipp bearbeiten",
      }));
    }
  }

  function renderPreLock(participants) {
    const c = $("#content");
    c.innerHTML = "";
    $("#banner").innerHTML =
      '<div class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm">' +
      "🔒 Solange das Turnier nicht angepfiffen ist, sind die Tipps der anderen verborgen – das hält es fair. " +
      "Die Rangliste erscheint automatisch ab dem Anpfiff.</div>";

    c.appendChild(el("h2", { class: "text-lg font-bold mb-3", text: "Teilnehmer" }));
    if (!participants.length) {
      c.appendChild(el("p", { class: "text-sm text-slate-500", text: "Noch niemand dabei. Teile den Pool-Code!" }));
      return;
    }
    const grid = el("div", { class: "grid gap-2 sm:grid-cols-2 lg:grid-cols-3" });
    participants.forEach((p) => {
      grid.appendChild(el("div", { class: "rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm flex items-center gap-2" }, [
        el("span", { class: "text-slate-400", text: "👤" }),
        el("span", { text: p.display_name }),
      ]));
    });
    c.appendChild(grid);
  }

  function renderLeaderboard(participants, predictions, resultsObj) {
    const c = $("#content");
    c.innerHTML = "";
    const results = resultsObj.payload || {};
    const byId = {};
    predictions.forEach((pr) => (byId[pr.participant_id] = pr.payload));

    const resultsEntered = Scoring.hasResults(results);
    $("#banner").innerHTML = resultsEntered
      ? '<div class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800 text-sm">📊 Ergebnisse werden laufend ausgewertet. Stand: ' +
        fmtDateTime(resultsObj.updated_at) + "</div>"
      : '<div class="rounded-xl bg-slate-100 border border-slate-200 p-4 text-slate-600 text-sm">Die Tipps sind jetzt einsehbar. Sobald echte Ergebnisse eingetragen sind, erscheinen hier Punkte.</div>';

    // Rangliste berechnen
    const rows = participants.map((p) => {
      const payload = byId[p.id] || Core.emptyPrediction();
      const det = Scoring.scoreDetailed(payload, results);
      return { name: p.display_name, payload, total: det.total, parts: det.parts };
    });
    rows.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

    c.appendChild(el("h2", { class: "text-lg font-bold mb-3", text: "Rangliste" }));
    const list = el("div", { class: "space-y-2" });
    rows.forEach((r, i) => list.appendChild(leaderRow(r, i + 1, resultsEntered)));
    c.appendChild(list);

    if (resultsEntered) {
      const wrap = el("div", { class: "mt-8" });
      wrap.appendChild(el("h2", { class: "text-lg font-bold mb-2", text: "Offizielle Ergebnisse" }));
      const det = el("details", { class: "rounded-xl border border-slate-200 bg-white p-2" });
      det.appendChild(el("summary", { class: "cursor-pointer text-sm font-medium px-2 py-1", text: "Ergebnis-Bracket anzeigen" }));
      const host = el("div", { class: "p-2" });
      let mounted = false;
      det.addEventListener("toggle", () => {
        if (det.open && !mounted) { window.BracketEditor.mount(host, { payload: results, readOnly: true }); mounted = true; }
      });
      det.appendChild(host);
      wrap.appendChild(det);
      c.appendChild(wrap);
    }
  }

  function leaderRow(r, rank, showPoints) {
    const card = el("div", { class: "rounded-xl border border-slate-200 bg-white overflow-hidden" });
    const head = el("div", { class: "flex items-center gap-3 px-4 py-3" });
    head.appendChild(el("span", { class: "w-7 text-center font-extrabold " + (rank <= 3 ? "text-amber-500" : "text-slate-400"), text: rank + "." }));
    head.appendChild(el("span", { class: "flex-1 font-semibold truncate", text: r.name }));
    if (showPoints) head.appendChild(el("span", { class: "font-bold text-blue-700", text: r.total + " Pkt" }));

    const champ = r.payload.ko && r.payload.ko.champion;
    if (champ) {
      head.appendChild(el("span", { class: "hidden sm:flex items-center gap-1 text-xs text-slate-500" }, [
        el("span", { text: "🏆" }), window.UI.flag(champ, 28), el("span", { text: window.WM.teamName(champ) }),
      ]));
    }
    const toggle = el("button", { class: "text-xs bg-slate-100 hover:bg-slate-200 rounded px-2 py-1", text: "Tipp ansehen" });
    head.appendChild(toggle);
    card.appendChild(head);

    const body = el("div", { class: "hidden border-t border-slate-100 p-3 bg-slate-50" });
    let mounted = false;
    toggle.addEventListener("click", () => {
      body.classList.toggle("hidden");
      toggle.textContent = body.classList.contains("hidden") ? "Tipp ansehen" : "einklappen";
      if (!mounted && !body.classList.contains("hidden")) {
        if (showPoints) body.appendChild(breakdown(r.parts));
        const ed = el("div", {});
        body.appendChild(ed);
        window.BracketEditor.mount(ed, { payload: r.payload, readOnly: true });
        mounted = true;
      }
    });
    card.appendChild(body);
    return card;
  }

  function breakdown(parts) {
    const wrap = el("div", { class: "flex flex-wrap gap-2 mb-3 text-xs" });
    Object.keys(parts).forEach((k) => {
      if (!parts[k]) return;
      wrap.appendChild(el("span", { class: "bg-white border border-slate-200 rounded px-2 py-1", text: Scoring.LABELS[k] + ": " + parts[k] }));
    });
    if (!wrap.children.length) wrap.appendChild(el("span", { class: "text-slate-400", text: "Noch keine Punkte." }));
    return wrap;
  }

  async function init() {
    if (!poolId) { $("#loading").innerHTML = 'Kein Pool angegeben. <a class="text-blue-600 underline" href="index.html">Startseite</a>.'; return; }
    let pool, participants;
    try {
      pool = await window.DB.getPool(poolId);
      participants = await window.DB.listParticipants(poolId);
    } catch (e) {
      $("#loading").innerHTML = "Pool konnte nicht geladen werden: " + e.message;
      return;
    }
    renderHead(pool, participants.length);
    $("#loading").classList.add("hidden");

    if (!pool.locked) { renderPreLock(participants); return; }

    let predictions = [], results = { payload: {}, updated_at: null };
    try {
      predictions = await window.DB.listPredictions(poolId);
      results = await window.DB.getResults();
    } catch (e) { toast(e.message, "err"); }
    renderLeaderboard(participants, predictions, results);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
