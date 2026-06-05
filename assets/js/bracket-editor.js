/*
 * bracket-editor.js – wiederverwendbarer Tipp-/Ergebnis-Editor (DOM).
 * Nutzung:  const ctl = BracketEditor.mount(rootEl, { payload, readOnly, onChange });
 *   payload   – Tipp-/Ergebnis-Objekt (siehe bracket-core.js); Standard = leer
 *   readOnly  – true: nur Anzeige (Pool-Ansicht)
 *   onChange(payload) – wird nach jeder Änderung aufgerufen (zum Speichern/Status)
 */
window.BracketEditor = (function () {
  "use strict";
  const WM = window.WM, Core = window.WMCore, el = window.UI.el, toast = window.UI.toast;

  function flagImg(code) {
    return el("img", { src: WM.flagUrl(code, 40), class: "flag", alt: WM.teamName(code), loading: "lazy" });
  }

  function mount(root, opts) {
    opts = opts || {};
    const state = {
      payload: Core.ensure(opts.payload || Core.emptyPrediction()),
      readOnly: !!opts.readOnly,
      onChange: opts.onChange || function () {},
    };
    Core.normalize(state.payload);

    root.innerHTML = "";
    root.className = "space-y-10";
    const groupsWrap = el("section", {});
    const koWrap = el("section", {});
    root.appendChild(groupsWrap);
    root.appendChild(koWrap);

    function commit(alsoGroups) {
      Core.normalize(state.payload);
      if (alsoGroups) renderGroups();
      renderKo();
      state.onChange(state.payload);
    }

    function reconcileThirds() {
      const valid = new Set();
      WM.GROUP_LETTERS.forEach((g) => { const c = state.payload.groups[g][2]; if (c) valid.add(c); });
      state.payload.thirds = (state.payload.thirds || []).filter((c) => valid.has(c));
    }

    // ---------------- Gruppenphase ----------------
    function renderGroups() {
      groupsWrap.innerHTML = "";
      groupsWrap.appendChild(el("div", { class: "flex items-center justify-between flex-wrap gap-2 mb-2" }, [
        el("h2", { class: "text-xl font-bold text-slate-800", text: "1) Gruppenphase" }),
        thirdsCounter(),
      ]));
      groupsWrap.appendChild(el("p", { class: "text-sm text-slate-500 mb-4",
        text: state.readOnly ? "Getippte Endplatzierung der Gruppen."
          : "Ziehe die Teams am Griff ⠿ in die getippte Reihenfolge (1.–4.). Hake bei den Gruppen­dritten an, wer als einer der 8 besten Dritten weiterkommt." }));
      const grid = el("div", { class: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" });
      WM.GROUP_LETTERS.forEach((g) => grid.appendChild(groupCard(g)));
      groupsWrap.appendChild(grid);
    }

    function thirdsCounter() {
      const n = (state.payload.thirds || []).length;
      const ok = n === 8;
      return el("span", {
        class: "text-sm font-semibold px-3 py-1 rounded-full " + (ok ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"),
        text: "Beste Dritte: " + n + " / 8",
      });
    }

    function groupCard(g) {
      const arr = state.payload.groups[g];
      const card = el("div", { class: "rounded-xl border border-slate-200 bg-white p-3 shadow-sm" });
      card.appendChild(el("div", { class: "font-bold text-slate-700 mb-1", text: "Gruppe " + g }));
      const list = el("div", { class: "grp-list", "data-grp": g });
      arr.forEach((code, idx) => list.appendChild(groupRow(g, code, idx)));
      card.appendChild(list);
      if (!state.readOnly && window.Sortable) {
        window.Sortable.create(list, {
          handle: ".drag-handle", draggable: ".grp-row", animation: 150,
          ghostClass: "sortable-ghost", chosenClass: "sortable-chosen", dragClass: "sortable-drag",
          onEnd: () => applyOrder(g, list),
        });
      }
      return card;
    }

    function groupRow(g, code, idx) {
      const cls = idx <= 1 ? "adv" : (idx === 2 ? "third" : "out"); // 1./2.=grün, 3.=gelb, 4.=rot
      const row = el("div", { class: "grp-row " + cls, "data-code": code });
      row.appendChild(el("span", { class: "w-5 text-slate-400 text-sm font-semibold", text: (idx + 1) + "." }));
      if (!state.readOnly) row.appendChild(el("span", { class: "drag-handle", title: "ziehen zum Sortieren", text: "⠿" }));
      row.appendChild(flagImg(code));
      row.appendChild(el("span", { class: "flex-1 text-sm truncate", text: WM.teamName(code) }));
      if (idx === 2) {
        if (state.readOnly) {
          const adv = (state.payload.thirds || []).indexOf(code) !== -1;
          row.appendChild(el("span", { class: "text-xs font-semibold " + (adv ? "text-emerald-600" : "text-slate-300"), text: adv ? "weiter ✓" : "raus" }));
        } else {
          const cb = el("input", { type: "checkbox", class: "w-4 h-4 accent-blue-600 ml-1", title: "kommt als bester Dritter weiter" });
          cb.checked = (state.payload.thirds || []).indexOf(code) !== -1;
          cb.addEventListener("change", () => toggleThird(code, cb));
          row.appendChild(cb);
        }
      }
      return row;
    }

    // Liest die neue Reihenfolge aus dem DOM (nach dem Ziehen) und übernimmt sie.
    function applyOrder(g, list) {
      const codes = Array.prototype.slice.call(list.querySelectorAll(".grp-row"))
        .map((r) => r.getAttribute("data-code"));
      if (codes.length === 4) state.payload.groups[g] = codes;
      reconcileThirds();
      commit(true);
    }

    function toggleThird(code, cb) {
      const list = state.payload.thirds || (state.payload.thirds = []);
      const pos = list.indexOf(code);
      if (pos !== -1) list.splice(pos, 1);
      else {
        if (list.length >= 8) { cb.checked = false; toast("Es können nur 8 Dritte weiterkommen – erst einen abwählen.", "err"); return; }
        list.push(code);
      }
      commit(true);
    }

    // ---------------- K.-o.-Runden: symmetrischer Turnierbaum (FOMOB-Stil) -------
    // Reihenfolge der Spiele je Runde/Seite aus der offiziellen Verdrahtung ableiten,
    // damit die Verbindungslinien sauber zusammenlaufen (Finale + Pokal in der Mitte).
    function treeOrder() {
      const B = WM.BRACKET;
      function half(sfIdx) {
        const qf = B.sf[sfIdx].slice();                          // 2 Viertelfinal-Indizes
        const r16 = []; qf.forEach((q) => B.qf[q].forEach((r) => r16.push(r)));
        const r32 = []; r16.forEach((r) => B.r16[r].forEach((s) => r32.push(s)));
        return { sf: [sfIdx], qf: qf, r16: r16, r32: r32 };
      }
      const fin = B.final[0];                                     // [sf-links, sf-rechts]
      return { L: half(fin[0]), R: half(fin[1]) };
    }

    function legend() {
      const wrap = el("div", { class: "ko-legend" });
      wrap.appendChild(el("span", { class: "lg lg-win", text: "● kommt weiter" }));
      wrap.appendChild(el("span", { class: "lg lg-lose", text: "● scheidet aus" }));
      return wrap;
    }

    function renderKo() {
      // Scroll-Position des Turnierbaums merken, damit der Cursor beim Tippen
      // (Neu-Rendern nach jedem Klick) nicht zurück nach links/zur Mitte springt.
      const prevScroller = koWrap.querySelector(".ko-scroller");
      const prevScroll = prevScroller ? { left: prevScroller.scrollLeft, top: prevScroller.scrollTop } : null;
      koWrap.innerHTML = "";
      koWrap.appendChild(el("h2", { class: "text-xl font-bold text-slate-800 mb-1", text: "2) K.-o.-Runden" }));
      const thirdsOk = (state.payload.thirds || []).length === 8;
      koWrap.appendChild(el("p", { class: "text-sm text-slate-500 mb-2",
        text: state.readOnly ? "Getippter Turnierverlauf bis zum Weltmeister."
          : (thirdsOk ? "Tippe je Spiel auf das weiterkommende Team – Sieger werden grün, Verlierer rot. Der Finalsieger ist dein Weltmeister."
            : "Hinweis: Wähle oben erst 8 Gruppendritte, dann ist das Sechzehntelfinale komplett besetzt.") }));
      koWrap.appendChild(legend());

      const b = Core.computeBracket(state.payload);
      const ord = treeOrder();

      const r32Desc = (i) => { const m = b.r32[i]; return { a: m.a, b: m.b, aLabel: m.aLabel, bLabel: m.bLabel, winner: m.winner, pick: (c) => setR32(m.id, c) }; };
      const rndDesc = (round, i) => { const m = b[round][i]; return { a: m.a, b: m.b, winner: m.winner, pick: (c) => setRound(round, i, c) }; };

      const tree = el("div", { class: "ko-tree" });

      // Runden-Spalte: Titel + gleichmäßig verteilte Match-Karten
      function roundCol(title, descs) {
        const col = el("div", { class: "col round-col" });
        col.appendChild(el("div", { class: "col-title", text: title }));
        const body = el("div", { class: "col-body" });
        descs.forEach((d) => body.appendChild(matchCard(d)));
        col.appendChild(body);
        return col;
      }
      // Verbinder-Spalte: k Klammern, jede so hoch wie der Abstand ihrer beiden Zubringer
      function connCol(k, mirror) {
        const col = el("div", { class: "col conn-col" });
        col.appendChild(el("div", { class: "col-title" }));
        const body = el("div", { class: "col-body" });
        for (let i = 0; i < k; i++) {
          const c = el("div", { class: "conn" + (mirror ? " mirror" : "") });
          c.style.height = "calc(var(--bh) / " + (2 * k) + ")";
          c.appendChild(el("div", { class: "out" }));
          body.appendChild(c);
        }
        col.appendChild(body);
        return col;
      }
      // gerade Linie (Halbfinale -> Finale)
      function straightConn() {
        const col = el("div", { class: "col conn-col" });
        col.appendChild(el("div", { class: "col-title" }));
        const body = el("div", { class: "col-body straight" });
        body.appendChild(el("div", { class: "hline" }));
        col.appendChild(body);
        return col;
      }

      // linke Hälfte: fließt nach rechts zur Mitte
      tree.appendChild(roundCol("Sechzehntel", ord.L.r32.map(r32Desc)));
      tree.appendChild(connCol(4, false));
      tree.appendChild(roundCol("Achtel", ord.L.r16.map((i) => rndDesc("r16", i))));
      tree.appendChild(connCol(2, false));
      tree.appendChild(roundCol("Viertel", ord.L.qf.map((i) => rndDesc("qf", i))));
      tree.appendChild(connCol(1, false));
      tree.appendChild(roundCol("Halb", ord.L.sf.map((i) => rndDesc("sf", i))));
      tree.appendChild(straightConn());

      // Mitte: Pokal + Finale + Weltmeister
      const center = el("div", { class: "col center-col" });
      center.appendChild(el("div", { class: "col-title", text: "Finale" }));
      const cbody = el("div", { class: "col-body center-body" });
      cbody.appendChild(el("div", { class: "trophy", text: "🏆" }));
      cbody.appendChild(matchCard({ a: b.final.a, b: b.final.b, winner: b.final.winner, pick: (c) => setChampion(c) }));
      const champ = state.payload.ko.champion;
      cbody.appendChild(el("div", { class: "champ" + (champ ? " on" : ""),
        text: champ ? "🏆 " + WM.teamName(champ) : "Weltmeister?" }));
      center.appendChild(cbody);
      tree.appendChild(center);

      // rechte Hälfte: gespiegelt, fließt nach links zur Mitte
      tree.appendChild(straightConn());
      tree.appendChild(roundCol("Halb", ord.R.sf.map((i) => rndDesc("sf", i))));
      tree.appendChild(connCol(1, true));
      tree.appendChild(roundCol("Viertel", ord.R.qf.map((i) => rndDesc("qf", i))));
      tree.appendChild(connCol(2, true));
      tree.appendChild(roundCol("Achtel", ord.R.r16.map((i) => rndDesc("r16", i))));
      tree.appendChild(connCol(4, true));
      tree.appendChild(roundCol("Sechzehntel", ord.R.r32.map(r32Desc)));

      const scroller = el("div", { class: "ko-scroller" });
      scroller.appendChild(tree);
      koWrap.appendChild(scroller);

      // Gemerkte Scroll-Position wiederherstellen (Cursor bleibt auf seiner Seite).
      if (prevScroll) { scroller.scrollLeft = prevScroll.left; scroller.scrollTop = prevScroll.top; }
    }

    function matchCard(mt) {
      const card = el("div", { class: "match" });
      card.appendChild(teamRow(mt, "a"));
      card.appendChild(teamRow(mt, "b"));
      return card;
    }
    function teamRow(mt, side) {
      const code = mt[side];
      const decided = !!mt.winner;
      const isWin = code && mt.winner === code;        // weiter -> grün
      const isLose = code && decided && mt.winner !== code; // raus -> rot
      const row = el("div", { class: "team-row" + (isWin ? " winner" : "") + (isLose ? " loser" : "") + ((!code || state.readOnly) ? " disabled" : "") });
      if (code) {
        row.appendChild(flagImg(code));
        row.appendChild(el("span", { class: "nm text-sm", text: WM.teamName(code) }));
        if (isWin) row.appendChild(el("span", { class: "mark win", text: "✓" }));
        else if (isLose) row.appendChild(el("span", { class: "mark lose", text: "✗" }));
        if (!state.readOnly) row.addEventListener("click", () => mt.pick(code));
      } else {
        row.appendChild(el("span", { class: "nm text-sm italic text-slate-400", text: mt[side + "Label"] || "—" }));
      }
      return row;
    }

    function setR32(id, code) { const w = state.payload.ko.r32; if (w[id] === code) delete w[id]; else w[id] = code; commit(false); }
    function setRound(round, i, code) { const w = state.payload.ko[round]; if (w[i] === code) delete w[i]; else w[i] = code; commit(false); }
    function setChampion(code) { state.payload.ko.champion = state.payload.ko.champion === code ? null : code; commit(false); }

    renderGroups();
    renderKo();
    return { getPayload: () => state.payload, rerender: () => { renderGroups(); renderKo(); } };
  }

  return { mount };
})();
