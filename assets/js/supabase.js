/*
 * supabase.js – Verbindung zur Supabase-Cloud + dünne RPC-Hilfen.
 * Voraussetzung: supabase-js (UMD) ist vorher per <script> geladen.
 * Der öffentliche (publishable) Key darf im Browser stehen – Schreibzugriffe
 * sind durch RLS + SECURITY-DEFINER-Funktionen geschützt.
 */
(function () {
  "use strict";

  const SUPABASE_URL = "https://okmkaegnshsemrfatmnr.supabase.co";
  const SUPABASE_KEY = "sb_publishable_XaZnI36c5-Xhv9Y7DKLjpw_lCxwQCZj";

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  async function rpc(fn, args) {
    const { data, error } = await client.rpc(fn, args);
    if (error) throw new Error(error.message || "Unbekannter Fehler");
    return data;
  }

  window.DB = {
    client,

    // --- Pools / Beitritt (RPC) ---
    createPool: (name, lockAt) =>
      rpc("wm_create_pool", { p_name: name, p_lock_at: lockAt || null }),
    getPoolByCode: (code) => rpc("wm_get_pool_by_code", { p_code: code }),
    getPool: (id) => rpc("wm_get_pool", { p_id: id }),
    joinPool: (code, name) => rpc("wm_join_pool", { p_code: code, p_name: name }),

    // --- Tipp (RPC, Token-geschützt) ---
    getMine: (token) => rpc("wm_get_mine", { p_token: token }),
    savePrediction: (token, payload) =>
      rpc("wm_save_prediction", { p_token: token, p_payload: payload }),

    // --- Admin (RPC, Passwort-geschützt) ---
    setResults: (secret, payload) =>
      rpc("wm_set_results", { p_secret: secret, p_payload: payload }),

    // --- Direkte Lesezugriffe (RLS) ---
    listParticipants: async (poolId) => {
      const { data, error } = await client
        .from("wm_participants")
        .select("id,display_name,created_at")
        .eq("pool_id", poolId)
        .order("created_at");
      if (error) throw new Error(error.message);
      return data || [];
    },
    // Liefert erst ab Anpfiff Daten (RLS), davor leer:
    listPredictions: async (poolId) => {
      const { data, error } = await client
        .from("wm_predictions")
        .select("participant_id,payload,updated_at")
        .eq("pool_id", poolId);
      if (error) throw new Error(error.message);
      return data || [];
    },
    getResults: async () => {
      const { data, error } = await client
        .from("wm_results")
        .select("payload,updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data || { payload: {}, updated_at: null };
    },
  };
})();
