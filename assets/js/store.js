/*
 * store.js – hält die Anmeldung des globalen Benutzerkontos lokal (localStorage).
 * Gespeichert wird NUR { token, userId, username } – niemals das Passwort.
 * Das Session-Token ist ein langlebiger Zufalls-Schlüssel (UUID) aus wm_sessions;
 * damit holt man sich von jedem Gerät seine Pools, Tipps und Punkte.
 */
window.Auth = (function () {
  "use strict";
  const KEY = "wm_auth_v1";

  function get() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "null");
      return v && v.token ? v : null;
    } catch (e) { return null; }
  }
  function set(session) {
    // session: { token, user_id|userId, username }
    const v = {
      token: session.token,
      userId: session.userId || session.user_id || null,
      username: session.username || null,
    };
    localStorage.setItem(KEY, JSON.stringify(v));
    return v;
  }
  function clear() { localStorage.removeItem(KEY); }
  function token() { const v = get(); return v ? v.token : null; }
  function username() { const v = get(); return v ? v.username : null; }
  function isLoggedIn() { return !!token(); }

  return { get, set, clear, token, username, isLoggedIn };
})();
