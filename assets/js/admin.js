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

  async function init() {
    $("#save-btn").addEventListener("click", save);
    const saved = sessionStorage.getItem("wm_admin_pw");
    if (saved) $("#admin-pw").value = saved;

    let res = { payload: {} };
    try { res = await window.DB.getResults(); }
    catch (e) { toast("Konnte Ergebnisse nicht laden: " + e.message, "err"); }

    current = Core.ensure(res.payload || Core.emptyPrediction());
    $("#loading").classList.add("hidden");
    setStatus("bereit", "text-slate-400");
    window.BracketEditor.mount($("#editor"), {
      payload: current,
      readOnly: false,
      onChange: (p) => { current = p; setStatus("ungespeicherte Änderungen", "text-amber-500"); },
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
