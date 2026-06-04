/*
 * bracket-core.js – reine Turnierbaum-Logik (ohne DOM).
 * Wird von Editor, Pool-Ansicht, Admin & Wertung gemeinsam genutzt.
 *
 * Payload-Form eines Tipps (= auch der echten Ergebnisse):
 * {
 *   groups: { A:[1.,2.,3.,4.], ... },   // Team-Codes in Platzierungs-Reihenfolge
 *   thirds: ["RSA", ...],               // 8 weitergekommene Gruppendritte (Codes)
 *   ko: {
 *     r32: { "R32-1": code, ... },      // Sieger je Sechzehntelfinale
 *     r16: { 0:code, 1:code, ... },     // Sieger je Achtelfinale (Index)
 *     qf:  { 0:code, ... },             // Sieger je Viertelfinale
 *     sf:  { 0:code, 1:code },          // Sieger je Halbfinale (= Finalisten)
 *     champion: code                    // Sieger des Finales (Weltmeister)
 *   }
 * }
 */
window.WMCore = (function () {
  "use strict";
  const WM = window.WM;

  function emptyPrediction() {
    const groups = {};
    WM.GROUP_LETTERS.forEach((g) => (groups[g] = WM.GROUPS[g].slice()));
    return { groups, thirds: [], ko: { r32: {}, r16: {}, qf: {}, sf: {}, champion: null } };
  }

  // Sorgt dafuer, dass ein (evtl. unvollstaendiges) Payload alle Felder hat.
  function ensure(payload) {
    payload = payload || {};
    if (!payload.groups) payload.groups = {};
    WM.GROUP_LETTERS.forEach((g) => {
      const cur = payload.groups[g];
      if (!Array.isArray(cur) || cur.length !== 4) payload.groups[g] = WM.GROUPS[g].slice();
    });
    if (!Array.isArray(payload.thirds)) payload.thirds = [];
    if (!payload.ko) payload.ko = {};
    ["r32", "r16", "qf", "sf"].forEach((r) => { if (!payload.ko[r]) payload.ko[r] = {}; });
    if (typeof payload.ko.champion === "undefined") payload.ko.champion = null;
    return payload;
  }

  function groupRank(payload, letter, rank) {
    const arr = (payload.groups && payload.groups[letter]) || WM.GROUPS[letter];
    return arr[rank] || null; // rank 0=Sieger,1=Zweiter,2=Dritter,3=Vierter
  }

  // Beschriftung eines R32-Slots
  function slotLabel(slot) {
    if (slot.w) return "Sieger " + slot.w;
    if (slot.r) return "2. Gr. " + slot.r;
    if (slot.t) return "3. (" + slot.t.join("/") + ")";
    return "?";
  }

  // Welche Dritten kommen weiter -> { gruppe: code }
  function thirdsByGroup(payload) {
    const map = {};
    (payload.thirds || []).forEach((code) => {
      const t = WM.team(code);
      if (t) map[t.group] = code;
    });
    return map;
  }

  // Maximales bipartites Matching: Dritte-Gruppen -> Dritt-Slots (FIFA-Regelmengen).
  // Kuhn-Algorithmus. Liefert { matchId: code|null }.
  function assignThirds(payload) {
    const slots = WM.R32.filter((m) => m.b.t).map((m) => ({ matchId: m.id, allowed: m.b.t }));
    const g2c = thirdsByGroup(payload);
    const groups = Object.keys(g2c);
    const slotMatch = {}; // matchId -> group

    function tryAssign(g, visited) {
      for (const slot of slots) {
        if (slot.allowed.indexOf(g) !== -1 && !visited[slot.matchId]) {
          visited[slot.matchId] = true;
          if (!slotMatch[slot.matchId] || tryAssign(slotMatch[slot.matchId], visited)) {
            slotMatch[slot.matchId] = g;
            return true;
          }
        }
      }
      return false;
    }
    groups.forEach((g) => tryAssign(g, {}));

    const out = {};
    slots.forEach((s) => (out[s.matchId] = slotMatch[s.matchId] ? g2c[slotMatch[s.matchId]] : null));
    return out;
  }

  // Teilnehmer aller 16 Sechzehntelfinals (Codes oder null) + Labels.
  function r32Participants(payload) {
    const thirds = assignThirds(payload);
    return WM.R32.map((m) => ({
      id: m.id,
      fifa: m.fifa,
      a: resolveSlot(payload, m.a, thirds, m.id),
      b: resolveSlot(payload, m.b, thirds, m.id),
      aLabel: slotLabel(m.a),
      bLabel: slotLabel(m.b),
    }));
  }
  function resolveSlot(payload, slot, thirds, matchId) {
    if (slot.w) return groupRank(payload, slot.w, 0);
    if (slot.r) return groupRank(payload, slot.r, 1);
    if (slot.t) return thirds[matchId] || null;
    return null;
  }

  // Entfernt Sieger-Picks, die nach Änderungen ungueltig wurden (von unten nach oben).
  function normalize(payload) {
    ensure(payload);
    const ko = payload.ko;

    const r32parts = r32Participants(payload);
    r32parts.forEach((m) => {
      const w = ko.r32[m.id];
      if (w && w !== m.a && w !== m.b) delete ko.r32[m.id];
    });
    const r32w = WM.R32.map((m) => ko.r32[m.id] || null);

    const r16w = stepNormalize(ko, "r16", WM.BRACKET.r16, r32w);
    const qfw = stepNormalize(ko, "qf", WM.BRACKET.qf, r16w);
    const sfw = stepNormalize(ko, "sf", WM.BRACKET.sf, qfw);

    if (ko.champion && ko.champion !== sfw[0] && ko.champion !== sfw[1]) ko.champion = null;
    return payload;
  }
  function stepNormalize(ko, key, pairing, prevWinners) {
    pairing.forEach((pair, i) => {
      const a = prevWinners[pair[0]] || null;
      const b = prevWinners[pair[1]] || null;
      const w = ko[key][i];
      if (w && w !== a && w !== b) delete ko[key][i];
    });
    return pairing.map((p, i) => ko[key][i] || null);
  }

  // Vollständig aufgelöster Baum für Anzeige.
  function computeBracket(payload) {
    ensure(payload);
    const ko = payload.ko;
    const r32 = r32Participants(payload);
    const r32w = WM.R32.map((m) => ko.r32[m.id] || null);
    r32.forEach((m, i) => { m.winner = r32w[i]; }); // Sieger anhängen -> Grün/Rot schon im Sechzehntelfinale

    const r16 = buildRound(WM.BRACKET.r16, r32w, ko.r16);
    const r16w = r16.map((m) => m.winner);
    const qf = buildRound(WM.BRACKET.qf, r16w, ko.qf);
    const qfw = qf.map((m) => m.winner);
    const sf = buildRound(WM.BRACKET.sf, qfw, ko.sf);
    const sfw = sf.map((m) => m.winner); // 2 Finalisten

    const fin = { idx: 0, a: sfw[0] || null, b: sfw[1] || null, winner: ko.champion || null };
    return { r32, r32w, r16, r16w, qf, qfw, sf, sfw, final: fin };
  }
  function buildRound(pairing, prevWinners, koRound) {
    return pairing.map((pair, i) => ({
      idx: i,
      a: prevWinners[pair[0]] || null,
      b: prevWinners[pair[1]] || null,
      winner: (koRound && koRound[i]) || null,
    }));
  }

  // Mengen der Teams, die jede Runde erreichen (für die Wertung).
  function reachedSets(payload) {
    const b = computeBracket(payload);
    const set = (arr) => new Set(arr.filter(Boolean));
    return {
      r16: set(b.r32w), // erreichten das Achtelfinale (16 Teams)
      qf: set(b.r16w),
      sf: set(b.qfw),
      final: set(b.sfw),
      champion: b.final.winner || null,
    };
  }

  // Fortschritt (für Anzeige "x/ y gesetzt")
  function progress(payload) {
    ensure(payload);
    const b = computeBracket(payload);
    const cnt = (arr) => arr.filter(Boolean).length;
    return {
      thirds: (payload.thirds || []).length,
      r32: cnt(b.r32w),
      r16: cnt(b.r16w),
      qf: cnt(b.qfw),
      sf: cnt(b.sfw),
      champion: b.final.winner ? 1 : 0,
      complete:
        (payload.thirds || []).length === 8 &&
        cnt(b.r32w) === 16 && cnt(b.r16w) === 8 && cnt(b.qfw) === 4 &&
        cnt(b.sfw) === 2 && !!b.final.winner,
    };
  }

  return {
    emptyPrediction, ensure, normalize, computeBracket,
    r32Participants, assignThirds, reachedSets, progress,
    slotLabel, groupRank,
  };
})();
