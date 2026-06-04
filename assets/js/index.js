/* index.js – Startseite: Pool anlegen / beitreten / "Meine Tipps" */
(function () {
  "use strict";
  const { $, el, toast, copy, getParam, fmtDateTime } = window.UI;
  const baseUrl = location.href.split("?")[0];

  // ---- Beitreten ----
  async function join() {
    const code = ($("#join-code").value || "").trim().toUpperCase();
    const name = ($("#join-name").value || "").trim();
    if (!code) return toast("Bitte Pool-Code eingeben.", "err");
    if (!name) return toast("Bitte deinen Namen eingeben.", "err");
    const btn = $("#join-btn");
    btn.disabled = true; btn.textContent = "Trete bei …";
    try {
      const r = await window.DB.joinPool(code, name);
      window.Store.upsert({
        poolId: r.pool_id, poolName: r.pool_name, participantId: r.participant_id,
        token: r.token, displayName: name,
      });
      location.href = "bracket.html?token=" + encodeURIComponent(r.token);
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false; btn.textContent = "Beitreten & tippen";
    }
  }

  // ---- Anlegen ----
  async function create() {
    const name = ($("#create-name").value || "").trim();
    if (!name) return toast("Bitte einen Namen für die Tipprunde eingeben.", "err");
    const btn = $("#create-btn");
    btn.disabled = true; btn.textContent = "Erstelle …";
    try {
      const r = await window.DB.createPool(name);
      const joinLink = baseUrl + "?join=" + r.join_code;
      const box = $("#create-result");
      box.innerHTML = "";
      box.classList.remove("hidden");
      box.appendChild(el("div", { class: "font-bold text-emerald-800 mb-1", text: "Pool erstellt! 🎉" }));
      box.appendChild(el("div", { class: "mb-2" }, [
        "Pool-Code: ",
        el("span", { class: "font-mono font-bold text-base tracking-widest", text: r.join_code }),
      ]));
      box.appendChild(el("div", { class: "text-slate-600 break-all mb-3", text: joinLink }));
      box.appendChild(el("div", { class: "flex gap-2 flex-wrap" }, [
        el("button", { class: "bg-blue-600 text-white rounded px-3 py-1.5 text-sm", text: "Link kopieren",
          onClick: () => copy(joinLink) }),
        el("button", { class: "bg-slate-200 rounded px-3 py-1.5 text-sm", text: "Jetzt selbst beitreten",
          onClick: () => { $("#join-code").value = r.join_code; $("#join-name").focus(); $("#join-name").scrollIntoView({ behavior: "smooth", block: "center" }); } }),
      ]));
      btn.disabled = false; btn.textContent = "Pool erstellen";
      $("#create-name").value = "";
    } catch (e) {
      toast(e.message, "err");
      btn.disabled = false; btn.textContent = "Pool erstellen";
    }
  }

  // ---- "Meine Tipps" ----
  function renderMine() {
    const list = window.Store.all();
    const host = $("#my-list");
    host.innerHTML = "";
    if (!list.length) { $("#my-empty").classList.remove("hidden"); return; }
    $("#my-empty").classList.add("hidden");
    list.forEach((e) => {
      const card = el("div", { class: "rounded-xl border border-slate-200 bg-white p-4 shadow-sm" });
      card.appendChild(el("div", { class: "font-bold", text: e.poolName || "Tipprunde" }));
      card.appendChild(el("div", { class: "text-sm text-slate-500 mb-3", text: "als " + e.displayName }));
      card.appendChild(el("div", { class: "flex gap-2 flex-wrap" }, [
        el("a", { href: "bracket.html?token=" + encodeURIComponent(e.token),
          class: "bg-blue-600 text-white rounded px-3 py-1.5 text-sm", text: "Tipp bearbeiten" }),
        el("a", { href: "pool.html?pool=" + encodeURIComponent(e.poolId),
          class: "bg-slate-200 rounded px-3 py-1.5 text-sm", text: "Pool & Rangliste" }),
      ]));
      host.appendChild(card);
    });
  }

  // ---- Init ----
  async function init() {
    $("#join-btn").addEventListener("click", join);
    $("#create-btn").addEventListener("click", create);
    renderMine();

    const pre = getParam("join");
    if (pre) {
      $("#join-code").value = pre.toUpperCase();
      try {
        const p = await window.DB.getPoolByCode(pre);
        const lbl = $("#join-pool-name");
        lbl.textContent = "Du trittst bei: " + p.name + " · Deadline " + fmtDateTime(p.lock_at);
        lbl.classList.remove("hidden");
      } catch (e) { /* Code evtl. ungültig – Nutzer sieht Fehler beim Beitreten */ }
      $("#join-name").focus();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
