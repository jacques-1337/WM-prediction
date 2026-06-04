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
          : "Sortiere jede Gruppe per ▲▼ auf die getippte Endplatzierung. Hake bei den Gruppen­dritten an, wer als einer der 8 besten Dritten weiterkommt." }));
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
      arr.forEach((code, idx) => {
        const row = el("div", { class: "grp-row" });
        row.appendChild(el("span", { class: "w-5 text-slate-400 text-sm font-semibold", text: (idx + 1) + "." }));
        row.appendChild(flagImg(code));
        row.appendChild(el("span", { class: "flex-1 text-sm truncate", text: WM.teamName(code) }));
        if (!state.readOnly) {
          const up = el("button", { class: "rankbtn", title: "nach oben", text: "▲", onClick: () => move(g, idx, -1) });
          const dn = el("button", { class: "rankbtn", title: "nach unten", text: "▼", onClick: () => move(g, idx, 1) });
          if (idx === 0) up.disabled = true;
          if (idx === arr.length - 1) dn.disabled = true;
          row.appendChild(up); row.appendChild(dn);
        }
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
        card.appendChild(row);
      });
      return card;
    }

    function move(g, idx, dir) {
      const arr = state.payload.groups[g];
      const j = idx + dir;
      if (j < 0 || j >= arr.length) return;
      const tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
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

    // ---------------- K.-o.-Runden ----------------
    function renderKo() {
      koWrap.innerHTML = "";
      koWrap.appendChild(el("h2", { class: "text-xl font-bold text-slate-800 mb-1", text: "2) K.-o.-Runden" }));
      const thirdsOk = (state.payload.thirds || []).length === 8;
      koWrap.appendChild(el("p", { class: "text-sm text-slate-500 mb-4",
        text: state.readOnly ? "Getippter Turnierverlauf bis zum Weltmeister."
          : (thirdsOk ? "Klicke in jedem Spiel auf den getippten Sieger – er rückt automatisch eine Runde weiter."
            : "Hinweis: Wähle oben erst 8 Gruppendritte, dann ist das Sechzehntelfinale komplett besetzt.") }));

      const b = Core.computeBracket(state.payload);
      const track = el("div", { class: "ko-track" });
      track.appendChild(koColumn("Sechzehntelfinale", b.r32.map((m) => ({
        a: m.a, b: m.b, aLabel: m.aLabel, bLabel: m.bLabel, winner: m.winner, pick: (c) => setR32(m.id, c),
      }))));
      track.appendChild(koColumn("Achtelfinale", b.r16.map((m, i) => mk(m, "r16", i))));
      track.appendChild(koColumn("Viertelfinale", b.qf.map((m, i) => mk(m, "qf", i))));
      track.appendChild(koColumn("Halbfinale", b.sf.map((m, i) => mk(m, "sf", i))));
      track.appendChild(koColumn("Finale", [{ a: b.final.a, b: b.final.b, winner: b.final.winner, pick: (c) => setChampion(c) }]));

      const scroller = el("div", { class: "ko-scroller" });
      scroller.appendChild(track);
      koWrap.appendChild(scroller);

      const champ = state.payload.ko.champion;
      const banner = el("div", { class: "mt-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-center gap-3" });
      banner.appendChild(el("span", { class: "text-2xl", text: "🏆" }));
      if (champ) {
        banner.appendChild(flagImg(champ));
        banner.appendChild(el("span", { class: "text-lg font-bold text-amber-800", text: "Weltmeister: " + WM.teamName(champ) }));
      } else {
        banner.appendChild(el("span", { class: "text-amber-700", text: "Noch kein Weltmeister getippt." }));
      }
      koWrap.appendChild(banner);
    }

    function mk(m, round, i) { return { a: m.a, b: m.b, winner: m.winner, pick: (c) => setRound(round, i, c) }; }

    function koColumn(title, matches) {
      const col = el("div", { class: "ko-col" });
      col.appendChild(el("div", { class: "text-xs font-bold uppercase tracking-wide text-slate-500", text: title }));
      matches.forEach((mt) => col.appendChild(matchCard(mt)));
      return col;
    }
    function matchCard(mt) {
      const card = el("div", { class: "match" });
      card.appendChild(teamRow(mt, "a"));
      card.appendChild(teamRow(mt, "b"));
      return card;
    }
    function teamRow(mt, side) {
      const code = mt[side];
      const isWin = code && mt.winner === code;
      const row = el("div", { class: "team-row" + (isWin ? " winner" : "") + ((!code || state.readOnly) ? " disabled" : "") });
      if (code) {
        row.appendChild(flagImg(code));
        row.appendChild(el("span", { class: "nm text-sm", text: WM.teamName(code) }));
        if (isWin) row.appendChild(el("span", { class: "text-emerald-600 text-sm", text: "✓" }));
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
