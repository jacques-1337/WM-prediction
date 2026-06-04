/*
 * store.js – merkt sich lokal (localStorage), an welchen Pools man als wer
 * teilnimmt – inklusive Geheim-Token zum Bearbeiten des eigenen Tipps.
 */
window.Store = (function () {
  "use strict";
  const KEY = "wm_me_v1";

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch (e) { return []; }
  }
  function writeAll(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  // entry: { poolId, poolName, participantId, token, displayName, savedAt }
  function upsert(entry) {
    const list = readAll().filter((e) => e.token !== entry.token);
    entry.savedAt = Date.now();
    list.unshift(entry);
    writeAll(list);
    return entry;
  }
  function all() { return readAll(); }
  function byPool(poolId) { return readAll().find((e) => e.poolId === poolId) || null; }
  function byToken(token) { return readAll().find((e) => e.token === token) || null; }
  function remove(token) { writeAll(readAll().filter((e) => e.token !== token)); }

  return { upsert, all, byPool, byToken, remove };
})();
