/* admin.js – echte Ergebnisse eintragen (Editor) + speichern mit Admin-Passwort */
(function () {
  "use strict";
  const { $, el, toast } = window.UI;
  const Core = window.WMCore;
  let current = null;

  function setStatus(text, cls) {
    const s = $("#save-status");
    s.textContent = text;
    s.className = "text-xs " + (cls || "text-slate-400");
  }

  async function save() {
    const pw = ($("#admin-pw").value || "").trim();
    if (!pw) return toast("Bitte Admin-Passwort eingeben.", "err");
    const btn = $("#save-btn");
    btn.disabled = true; setStatus("Speichere …", "text-slate-400");
    try {
      await window.DB.setResults(pw, current);
      sessionStorage.setItem("wm_admin_pw", pw);
      setStatus("Gespeichert ✓", "text-emerald-600");
      toast("Ergebnisse gespeichert.", "ok");
    } catch (e) {
      setStatus("Fehler", "text-rose-600");
      toast(e.message, "err");
    } finally {
      btn.disabled = false;
    }
  }

  function mountEditor() {
    window.BracketEditor.mount($("#editor"), {
      payload: current,
      readOnly: false,
      resultsMode: true,
      onChange: (p) => { current = p; setStatus("ungespeicherte Änderungen", "text-amber-500"); },
    });
  }

  // Vorlage aus results-live.js übernehmen (Schnappschuss der echten Ergebnisse).
  function loadLive() {
    const live = window.WM_LIVE_RESULTS;
    if (!live || !live.payload) return toast("Keine Ergebnis-Vorlage verfügbar.", "err");
    if (!confirm("Echte Ergebnisse (Stand " + live.asOf + ") laden?\n" +
      "Der aktuelle Editor-Inhalt wird ersetzt. Gespeichert wird erst mit „Ergebnisse speichern“.")) return;
    current = Core.ensure(JSON.parse(JSON.stringify(live.payload)));
    Core.normalize(current);
    mountEditor();
    setStatus("Vorlage geladen (Stand " + live.asOf + ") – noch nicht gespeichert", "text-amber-500");
    toast("Echte Ergebnisse übernommen. Bitte prüfen und speichern.", "ok");
  }

  async function init() {
    $("#save-btn").addEventListener("click", save);
    $("#load-live-btn").addEventListener("click", loadLive);
    const saved = sessionStorage.getItem("wm_admin_pw");
    if (saved) $("#admin-pw").value = saved;

    let res = { payload: {} };
    try { res = await window.DB.getResults(); }
    catch (e) { toast("Konnte Ergebnisse nicht laden: " + e.message, "err"); }

    current = Core.ensure(res.payload || Core.emptyPrediction());
    $("#loading").classList.add("hidden");
    setStatus("bereit", "text-slate-400");
    const hint = el("div", {
      class: "rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-sm mb-4",
      text: "Wichtig: Nur Gruppen mit Haken „Gruppe gewertet“ zählen für die Punkte. " +
        "Hake eine Gruppe erst an, wenn ihre Endplatzierung feststeht und korrekt eingetragen ist.",
    });
    $("#editor").parentNode.insertBefore(hint, $("#editor"));
    mountEditor();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
