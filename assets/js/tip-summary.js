/*
 * tip-summary.js – kompakte Zusammenfassung eines Tipps (Pool-Ansicht).
 * Statt des kompletten Turnierbaums: Gruppen-Reihenfolgen und die getippten
 * Teams je K.-o.-Runde als kleine Flaggen-Chips, farbig gegen das echte
 * Ergebnis geprüft. Der volle Baum bleibt als Detailansicht erreichbar.
 *
 * Nutzung: TipSummary.mount(rootEl, { payload, results, parts })
 *   payload – Tipp-Payload (siehe bracket-core.js)
 *   results – echtes Ergebnis-Payload oder null (dann neutrale Darstellung)
 *   parts   – Punkte-Aufschlüsselung aus Scoring.scoreDetailed (optional)
 */
window.TipSummary = (function () {
  "use strict";
  const WM = window.WM, Core = window.WMCore, el = window.UI.el;
  const clone = (o) => JSON.parse(JSON.stringify(o || {}));

  function flagImg(code) {
    return el("img", { src: WM.flagUrl(code, 40), class: "flag", alt: WM.teamName(code), loading: "lazy" });
  }

  function ptsBadge(n) {
    if (n == null) return null;
    return el("span", { class: "tsum-pts", text: n + " P." });
  }

  function chip(code, cls, title, withName) {
    const c = el("span", { class: "tchip" + (cls ? " " + cls : ""), title: title || WM.teamName(code) });
    c.appendChild(flagImg(code));
    if (withName) c.appendChild(el("span", { text: WM.teamName(code) }));
    return c;
  }

  // Status eines KO-Tipps gegen die Fakten: "hit" | "miss" | "" (offen)
  function koStatus(cmp, round, code) {
    if (!cmp || !code) return "";
    if (cmp.reached[round].has(code)) return "hit";
    if (cmp.eliminated[round].has(code)) return "miss";
    return "";
  }

  function mount(root, opts) {
    opts = opts || {};
    const P = Core.normalize(Core.ensure(clone(opts.payload)));
    const cmp = opts.results ? Core.resultInfo(opts.results) : null;
    const parts = opts.parts || null;
    const b = Core.computeBracket(P);

    root.innerHTML = "";
    root.className = "tsum";

    if (cmp) {
      const lg = el("div", { class: "tsum-legend" });
      lg.appendChild(el("span", { class: "lg-exact", text: "● richtig" }));
      lg.appendChild(el("span", { class: "lg-close", text: "● 1 Platz daneben (nur Gruppen)" }));
      lg.appendChild(el("span", { class: "lg-off", text: "● falsch" }));
      lg.appendChild(el("span", { text: "weiß = noch offen" }));
      root.appendChild(lg);
    }

    // ---- Gruppenphase: eine Zeile pro Gruppe, 4 Chips in getippter Reihenfolge
    const gSec = el("div", { class: "tsum-sec" }, [
      el("span", { class: "t", text: "Gruppenphase" }),
      parts ? ptsBadge(parts.groupPos || 0) : null,
    ]);
    root.appendChild(gSec);
    const grid = el("div", { class: "tsum-groups" });
    WM.GROUP_LETTERS.forEach((g) => {
      const row = el("div", { class: "tsum-grp" });
      row.appendChild(el("span", { class: "g", text: g }));
      const entered = cmp && cmp.enteredGroups.has(g);
      P.groups[g].forEach((code, idx) => {
        let cls = "", title = WM.teamName(code) + " – getippt " + (idx + 1) + ".";
        if (entered) {
          const actualIdx = cmp.groupOrder[g].indexOf(code);
          cls = actualIdx === idx ? "hit" : (Math.abs(actualIdx - idx) === 1 ? "close" : "miss");
          title += ", tatsächlich " + (actualIdx + 1) + ".";
        }
        const c = chip(code, cls, title);
        c.insertBefore(el("b", { text: String(idx + 1) }), c.firstChild);
        row.appendChild(c);
      });
      grid.appendChild(row);
    });
    root.appendChild(grid);

    // ---- Beste Dritte
    const thirds = (P.thirds || []).slice()
      .sort((a, c) => (WM.team(a).group < WM.team(c).group ? -1 : 1));
    if (thirds.length) {
      root.appendChild(koRow("Beste Dritte", thirds.map((code) => {
        let cls = "", title = WM.teamName(code) + " – als bester Dritter getippt";
        if (cmp) {
          if (cmp.thirdsSet.has(code)) { cls = "hit"; title += " ✓"; }
          else if (cmp.thirdsComplete) { cls = "miss"; title += " ✗"; }
        }
        return chip(code, cls, title);
      }), parts ? parts.groupThird : null));
    }

    // ---- K.-o.-Runden: pro Runde die getippten Teams (= Sieger der Vorrunde)
    const rounds = [
      { label: "Achtelfinale", round: "r16", codes: b.r32w, pts: "r16" },
      { label: "Viertelfinale", round: "qf", codes: b.r16w, pts: "qf" },
      { label: "Halbfinale", round: "sf", codes: b.qfw, pts: "sf" },
      { label: "Finale", round: "final", codes: b.sfw, pts: "final" },
    ];
    rounds.forEach((r) => {
      const codes = r.codes.filter(Boolean);
      if (!codes.length) return;
      root.appendChild(koRow(r.label, codes.map((code) => {
        const cls = koStatus(cmp, r.round, code);
        let title = WM.teamName(code) + " – " + r.label + " getippt";
        if (cls === "hit") title += ", erreicht ✓";
        else if (cls === "miss") title += ", ausgeschieden ✗";
        return chip(code, cls, title);
      }), parts ? parts[r.pts] : null));
    });

    // ---- Weltmeister
    const champ = P.ko.champion;
    if (champ) {
      let cls = "";
      if (cmp) {
        if (cmp.reached.champion === champ) cls = "hit";
        else if (cmp.reached.champion || cmp.eliminated.champion.has(champ)) cls = "miss";
      }
      const c = chip(champ, cls, null, true);
      c.insertBefore(el("span", { text: "🏆" }), c.firstChild);
      root.appendChild(koRow("Weltmeister", [c], parts ? parts.champion : null));
    }

    if (!thirds.length && !b.r32w.filter(Boolean).length && !champ) {
      root.appendChild(el("p", { class: "text-xs text-slate-400", text: "K.-o.-Runden wurden nicht getippt." }));
    }
  }

  function koRow(label, chips, pts) {
    const row = el("div", { class: "tsum-row" });
    row.appendChild(el("span", { class: "lbl", text: label }));
    const wrap = el("span", { class: "chips" });
    chips.forEach((c) => wrap.appendChild(c));
    row.appendChild(wrap);
    const badge = ptsBadge(pts);
    if (badge) row.appendChild(badge);
    return row;
  }

  return { mount };
})();
