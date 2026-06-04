/*
 * common.js – kleine UI-Helfer, die alle Seiten nutzen.
 */
window.UI = (function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach((k) => {
        if (k === "class") node.className = props[k];
        else if (k === "html") node.innerHTML = props[k];
        else if (k === "text") node.textContent = props[k];
        else if (k.slice(0, 2) === "on" && typeof props[k] === "function")
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        else if (props[k] != null) node.setAttribute(k, props[k]);
      });
    }
    (Array.isArray(children) ? children : children != null ? [children] : []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Flaggen-Bildchen (flagcdn) für einen Team-Code
  function flag(code, w) {
    const url = window.WM.flagUrl(code, w || 40);
    const img = el("img", {
      src: url,
      alt: window.WM.teamName(code),
      class: "inline-block rounded-sm shadow-sm align-middle",
      loading: "lazy",
      width: (w || 40) / 2,
    });
    img.style.width = ((w || 40) / 2) + "px";
    return img;
  }

  // "Flagge + Name" Chip
  function teamChip(code, opts) {
    opts = opts || {};
    const wrap = el("span", { class: "inline-flex items-center gap-2 " + (opts.class || "") });
    if (code) {
      wrap.appendChild(flag(code, opts.flagW || 32));
      wrap.appendChild(el("span", { text: window.WM.teamName(code) }));
    } else {
      wrap.appendChild(el("span", { class: "text-slate-400", text: opts.placeholder || "—" }));
    }
    return wrap;
  }

  function getParam(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function toast(msg, type) {
    let host = $("#toast-host");
    if (!host) {
      host = el("div", { id: "toast-host", class: "fixed top-4 right-4 z-50 flex flex-col gap-2" });
      document.body.appendChild(host);
    }
    const colors = {
      ok: "bg-emerald-600",
      err: "bg-rose-600",
      info: "bg-slate-800",
    };
    const t = el("div", {
      class: "text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-xs " + (colors[type] || colors.info),
      text: msg,
    });
    host.appendChild(t);
    setTimeout(() => {
      t.style.transition = "opacity .4s";
      t.style.opacity = "0";
      setTimeout(() => t.remove(), 400);
    }, type === "err" ? 5000 : 2800);
  }

  function fmtDateTime(iso) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("de-DE", {
        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch (e) { return iso; }
  }

  // Kopiert Text in die Zwischenablage (mit Fallback)
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast("In Zwischenablage kopiert", "ok");
    } catch (e) {
      toast("Kopieren nicht möglich – bitte manuell markieren", "err");
    }
  }

  return { $, $$, el, flag, teamChip, getParam, toast, fmtDateTime, copy };
})();
