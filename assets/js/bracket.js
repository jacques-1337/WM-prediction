/* bracket.js – Tipp-Seite: lädt eigenen Tipp, Editor + Auto-Speichern */
(function () {
  "use strict";
  const { $, el, toast, copy, getParam, fmtDateTime } = window.UI;
  const Core = window.WMCore;
  const Auth = window.Auth;

  const token = Auth.token();
  const poolId = getParam("pool");
  let meta = null;
  let saveTimer = null;
  let lastSavedJSON = "";

  function setStatus(text, cls) {
    const s = $("#save-status");
    s.textContent = text;
    s.className = "text-xs " + (cls || "text-slate-400");
  }

  function renderProgress(payload) {
    const p = Core.progress(payload);
    $("#progress").innerHTML =
      "Dritte " + p.thirds + "/8 · Sechzehntel " + p.r32 + "/16 · Achtel " + p.r16 +
      "/8 · Viertel " + p.qf + "/4 · Halb " + p.sf + "/2 · 🏆 " + (p.champion ? "✓" : "–") +
      (p.complete ? '  <span class="text-emerald-600 font-semibold">komplett</span>' : "");
  }

  async function doSave(payload) {
    if (meta.locked) return;
    const json = JSON.stringify(payload);
    if (json === lastSavedJSON) { setStatus("Gespeichert ✓", "text-emerald-600"); return; }
    setStatus("Speichere …", "text-slate-400");
    try {
      await window.DB.savePrediction(token, poolId, payload);
      lastSavedJSON = json;
      setStatus("Gespeichert ✓", "text-emerald-600");
    } catch (e) {
      setStatus("Fehler – nicht gespeichert", "text-rose-600");
      toast(e.message, "err");
    }
  }

  function onChange(payload) {
    renderProgress(payload);
    if (meta.locked) return;
    setStatus("Änderung …", "text-amber-500");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => doSave(payload), 800);
  }

  async function init() {
    if (!token) {
      $("#loading").innerHTML = 'Bitte zuerst <a class="text-blue-600 underline" href="index.html">anmelden</a>.';
      return;
    }
    if (!poolId) {
      $("#loading").innerHTML = 'Kein Pool ausgewählt. <a class="text-blue-600 underline" href="index.html">Zur Startseite</a>.';
      return;
    }
    try {
      meta = await window.DB.getMine(token, poolId);
    } catch (e) {
      $("#loading").innerHTML = "Konnte Tipp nicht laden: " + e.message +
        ' <br><a class="text-blue-600 underline" href="index.html">Zur Startseite</a>.';
      return;
    }

    $("#head-pool").textContent = meta.pool_name + " · " + meta.display_name;
    const poolUrl = location.origin + location.pathname.replace(/bracket\.html$/, "pool.html") +
      "?pool=" + encodeURIComponent(meta.pool_id);
    $("#pool-link").setAttribute("href", "pool.html?pool=" + encodeURIComponent(meta.pool_id));
    // "Pool-Link kopieren" teilt die Pool-/Ranglisten-Seite (der eigene Tipp bleibt privat).
    $("#link-btn").addEventListener("click", () => copy(poolUrl));

    const payload = Core.ensure(meta.payload || Core.emptyPrediction());
    lastSavedJSON = JSON.stringify(payload);

    if (meta.locked) {
      const b = $("#lock-banner");
      b.classList.remove("hidden");
      b.textContent = "⏱ Die Tippabgabe ist beendet (Anpfiff am " + fmtDateTime(meta.lock_at) +
        "). Dein Tipp ist jetzt schreibgeschützt.";
      setStatus("schreibgeschützt", "text-slate-400");
    } else {
      setStatus("Gespeichert ✓", "text-emerald-600");
      $("#lock-banner").classList.add("hidden");
    }

    $("#loading").classList.add("hidden");
    renderProgress(payload);
    window.BracketEditor.mount($("#editor"), { payload, readOnly: meta.locked, onChange });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
