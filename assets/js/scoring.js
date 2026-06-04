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

  // Sind überhaupt schon echte Ergebnisse eingetragen?
  function hasResults(actual) {
    if (!actual) return false;
    const g = actual.groups && Object.keys(actual.groups).length > 0;
    const t = actual.thirds && actual.thirds.length > 0;
    return !!(g || t || hasKo(actual.ko));
  }

  // Liefert { total, parts:{...} }.
  function scoreDetailed(prediction, actual) {
    const S = WM.SCORING;

    // Welche Gruppen hat der Admin wirklich eingetragen? (vor jeglichem Auffüllen)
    const rawGroups = (actual && actual.groups) || {};
    const presentGroups = Object.keys(rawGroups);
    const rawThirds = (actual && actual.thirds) || [];

    const P = Core.ensure(clone(prediction));
    const A = Core.ensure(clone(actual));

    const parts = { groupWinner: 0, groupRunnerUp: 0, groupThird: 0, r16: 0, qf: 0, sf: 0, final: 0, champion: 0 };

    // Gruppenphase (nur eingetragene Gruppen), Platz 1 & 2 positionsgenau
    presentGroups.forEach((g) => {
      const pg = P.groups[g] || [];
      const ag = rawGroups[g] || [];
      if (ag[0] && pg[0] === ag[0]) parts.groupWinner += S.groupWinner;
      if (ag[1] && pg[1] === ag[1]) parts.groupRunnerUp += S.groupRunnerUp;
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
    groupWinner: "Gruppensieger", groupRunnerUp: "Gruppenzweite", groupThird: "Beste Dritte",
    r16: "Achtelfinale", qf: "Viertelfinale", sf: "Halbfinale", final: "Finalisten", champion: "Weltmeister",
  };

  return { score, scoreDetailed, hasResults, LABELS };
})();
