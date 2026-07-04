/*
 * scoring.js – vergleicht einen Tipp mit den echten Ergebnissen und vergibt Punkte.
 * Punkteregeln stehen in data.js (WM.SCORING) und sind frei änderbar.
 * Wichtig: nur TATSÄCHLICH eingetragene Ergebnisse erzeugen Punkte (keine Default-
 * Reihenfolge wird gewertet), und die übergebenen Objekte werden nicht verändert.
 */
window.Scoring = (function () {
  "use strict";
  const WM = window.WM;
  const Core = window.WMCore;
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));

  function hasKo(ko) {
    if (!ko) return false;
    return (Object.keys(ko.r32 || {}).length || Object.keys(ko.r16 || {}).length ||
      Object.keys(ko.qf || {}).length || Object.keys(ko.sf || {}).length || ko.champion) ? true : false;
  }

  // Gruppen, die als "gewertet" gelten: bevorzugt der explizite doneGroups-
  // Marker aus dem Admin (verhindert, dass per ensure() aufgefüllte Default-
  // Reihenfolgen Punkte erzeugen), sonst Fallback auf die vorhandenen Keys.
  function enteredGroups(actual) {
    const rawGroups = (actual && actual.groups) || {};
    const keys = Array.isArray(actual && actual.doneGroups)
      ? actual.doneGroups : Object.keys(rawGroups);
    return keys.filter((g) => Array.isArray(rawGroups[g]) && rawGroups[g].length === 4);
  }

  // Sind überhaupt schon echte Ergebnisse eingetragen?
  function hasResults(actual) {
    if (!actual) return false;
    const g = enteredGroups(actual).length > 0;
    const t = actual.thirds && actual.thirds.length > 0;
    return !!(g || t || hasKo(actual.ko));
  }

  // Liefert { total, parts:{...} }.
  function scoreDetailed(prediction, actual) {
    const S = WM.SCORING;

    // Welche Gruppen hat der Admin wirklich gewertet? (vor jeglichem Auffüllen)
    const rawGroups = (actual && actual.groups) || {};
    const presentGroups = enteredGroups(actual);
    const rawThirds = (actual && actual.thirds) || [];

    const P = Core.ensure(clone(prediction));
    const A = Core.ensure(clone(actual));

    const parts = { groupPos: 0, groupThird: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0 };

    // Gruppenphase (nur eingetragene Gruppen): jede Platzierung 1.–4. positionsgenau.
    // Pro getipptem Team: Rangdifferenz zur Realität. 0 = exakt (groupExact),
    // genau 1 = ein Platz daneben/symmetrisch (groupOff1), >= 2 = nichts.
    presentGroups.forEach((g) => {
      const pg = P.groups[g] || [];
      const ag = rawGroups[g] || [];
      const actualPos = {}; // code -> realer Index (0=1.,1=2.,2=3.,3=4.)
      ag.forEach((code, idx) => { if (code) actualPos[code] = idx; });
      pg.forEach((code, predIdx) => {
        if (!code || !(code in actualPos)) return;
        const diff = Math.abs(predIdx - actualPos[code]);
        if (diff === 0) parts.groupPos += S.groupExact;
        else if (diff === 1) parts.groupPos += S.groupOff1;
      });
    });

    // weitergekommene Dritte: Schnittmenge
    const at = new Set(rawThirds);
    (P.thirds || []).forEach((c) => { if (at.has(c)) parts.groupThird += S.groupThird; });

    // erreichte K.-o.-Runden (leere ko -> leere Mengen -> 0 Punkte)
    const pr = Core.reachedSets(P);
    const ar = Core.reachedSets(A);
    ["r16", "qf", "sf", "final"].forEach((r) => {
      pr[r].forEach((code) => { if (ar[r].has(code)) parts[r] += S.reach[r]; });
    });

    // Weltmeister
    if (pr.champion && ar.champion && pr.champion === ar.champion) parts.champion += S.champion;

    let total = 0;
    Object.keys(parts).forEach((k) => (total += parts[k]));
    return { total, parts };
  }

  function score(prediction, actual) { return scoreDetailed(prediction, actual).total; }

  const LABELS = {
    groupPos: "Gruppen-Platzierung", groupThird: "Beste Dritte",
    r16: "Achtelfinale", qf: "Viertelfinale", sf: "Halbfinale", final: "Finalisten", champion: "Weltmeister",
  };

  return { score, scoreDetailed, hasResults, enteredGroups, LABELS };
})();
