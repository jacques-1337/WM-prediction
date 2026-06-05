/*
 * data.js – Stammdaten der WM 2026 (Teams, Gruppen, Turnierbaum, Termine, Punkte)
 *
 * Quelle Gruppen: offizielle Auslosung 05.12.2025 (Stand Juni 2026, alle Teams bestätigt).
 * Flaggen: flagcdn.com per ISO-3166-1-alpha-2-Code (Schottland=gb-sct, England=gb-eng).
 *
 * Turnierbaum: vollständig nach dem OFFIZIELLEN FIFA-Spielplan verdrahtet
 * (Match 73–88 = Sechzehntelfinale, 89–96 = Achtelfinale, 97–100 = Viertel,
 * 101/102 = Halbfinale, 104 = Finale). Siehe BRACKET unten.
 */
window.WM = (function () {
  "use strict";

  // ---- Teams: code -> { name (de), iso (flagcdn), group } -------------------
  const TEAMS = {
    // Gruppe A
    MEX: { name: "Mexiko", iso: "mx", group: "A" },
    RSA: { name: "Südafrika", iso: "za", group: "A" },
    KOR: { name: "Südkorea", iso: "kr", group: "A" },
    CZE: { name: "Tschechien", iso: "cz", group: "A" },
    // Gruppe B
    CAN: { name: "Kanada", iso: "ca", group: "B" },
    BIH: { name: "Bosnien-H.", iso: "ba", group: "B" },
    QAT: { name: "Katar", iso: "qa", group: "B" },
    SUI: { name: "Schweiz", iso: "ch", group: "B" },
    // Gruppe C
    BRA: { name: "Brasilien", iso: "br", group: "C" },
    MAR: { name: "Marokko", iso: "ma", group: "C" },
    HAI: { name: "Haiti", iso: "ht", group: "C" },
    SCO: { name: "Schottland", iso: "gb-sct", group: "C" },
    // Gruppe D
    USA: { name: "USA", iso: "us", group: "D" },
    PAR: { name: "Paraguay", iso: "py", group: "D" },
    AUS: { name: "Australien", iso: "au", group: "D" },
    TUR: { name: "Türkei", iso: "tr", group: "D" },
    // Gruppe E
    GER: { name: "Deutschland", iso: "de", group: "E" },
    CUW: { name: "Curaçao", iso: "cw", group: "E" },
    CIV: { name: "Elfenbeinküste", iso: "ci", group: "E" },
    ECU: { name: "Ecuador", iso: "ec", group: "E" },
    // Gruppe F
    NED: { name: "Niederlande", iso: "nl", group: "F" },
    JPN: { name: "Japan", iso: "jp", group: "F" },
    SWE: { name: "Schweden", iso: "se", group: "F" },
    TUN: { name: "Tunesien", iso: "tn", group: "F" },
    // Gruppe G
    BEL: { name: "Belgien", iso: "be", group: "G" },
    EGY: { name: "Ägypten", iso: "eg", group: "G" },
    IRN: { name: "Iran", iso: "ir", group: "G" },
    NZL: { name: "Neuseeland", iso: "nz", group: "G" },
    // Gruppe H
    ESP: { name: "Spanien", iso: "es", group: "H" },
    CPV: { name: "Kap Verde", iso: "cv", group: "H" },
    KSA: { name: "Saudi-Arabien", iso: "sa", group: "H" },
    URU: { name: "Uruguay", iso: "uy", group: "H" },
    // Gruppe I
    FRA: { name: "Frankreich", iso: "fr", group: "I" },
    SEN: { name: "Senegal", iso: "sn", group: "I" },
    IRQ: { name: "Irak", iso: "iq", group: "I" },
    NOR: { name: "Norwegen", iso: "no", group: "I" },
    // Gruppe J
    ARG: { name: "Argentinien", iso: "ar", group: "J" },
    ALG: { name: "Algerien", iso: "dz", group: "J" },
    AUT: { name: "Österreich", iso: "at", group: "J" },
    JOR: { name: "Jordanien", iso: "jo", group: "J" },
    // Gruppe K
    POR: { name: "Portugal", iso: "pt", group: "K" },
    COD: { name: "DR Kongo", iso: "cd", group: "K" },
    UZB: { name: "Usbekistan", iso: "uz", group: "K" },
    COL: { name: "Kolumbien", iso: "co", group: "K" },
    // Gruppe L
    ENG: { name: "England", iso: "gb-eng", group: "L" },
    CRO: { name: "Kroatien", iso: "hr", group: "L" },
    GHA: { name: "Ghana", iso: "gh", group: "L" },
    PAN: { name: "Panama", iso: "pa", group: "L" },
  };

  const GROUP_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

  // GROUPS: Buchstabe -> Liste der Team-Codes (Pot-/Auslosungsreihenfolge)
  const GROUPS = {};
  GROUP_LETTERS.forEach((g) => (GROUPS[g] = []));
  Object.keys(TEAMS).forEach((code) => GROUPS[TEAMS[code].group].push(code));

  // ---- Achtelfinale (Round of 32): 16 Partien -------------------------------
  // Slot-Typen:  { w:'A' } = Sieger Gruppe A · { r:'B' } = Zweiter Gruppe B
  //              { t:['A','B',...] } = ein bester Dritter aus diesen Gruppen
  // fifa = offizielle Match-Nummer (nur Referenz).
  const R32 = [
    { id: "R32-1",  fifa: 73, a: { r: "A" }, b: { r: "B" } },
    { id: "R32-2",  fifa: 74, a: { w: "E" }, b: { t: ["A", "B", "C", "D", "F"] } },
    { id: "R32-3",  fifa: 75, a: { w: "F" }, b: { r: "C" } },
    { id: "R32-4",  fifa: 76, a: { w: "C" }, b: { r: "F" } },
    { id: "R32-5",  fifa: 77, a: { w: "I" }, b: { t: ["C", "D", "F", "G", "H"] } },
    { id: "R32-6",  fifa: 78, a: { r: "E" }, b: { r: "I" } },
    { id: "R32-7",  fifa: 79, a: { w: "A" }, b: { t: ["C", "E", "F", "H", "I"] } },
    { id: "R32-8",  fifa: 80, a: { w: "L" }, b: { t: ["E", "H", "I", "J", "K"] } },
    { id: "R32-9",  fifa: 81, a: { w: "D" }, b: { t: ["B", "E", "F", "I", "J"] } },
    { id: "R32-10", fifa: 82, a: { w: "G" }, b: { t: ["A", "E", "H", "I", "J"] } },
    { id: "R32-11", fifa: 83, a: { r: "K" }, b: { r: "L" } },
    { id: "R32-12", fifa: 84, a: { w: "H" }, b: { r: "J" } },
    { id: "R32-13", fifa: 85, a: { w: "B" }, b: { t: ["E", "F", "G", "I", "J"] } },
    { id: "R32-14", fifa: 86, a: { w: "J" }, b: { r: "H" } },
    { id: "R32-15", fifa: 87, a: { w: "K" }, b: { t: ["D", "E", "I", "J", "L"] } },
    { id: "R32-16", fifa: 88, a: { r: "D" }, b: { r: "G" } },
  ];

  // ---- Turnierbaum ab Achtelfinale: OFFIZIELLE FIFA-Verdrahtung -------------
  // Indizes verweisen auf die jeweils vorige Runde.
  // R32-Index i = FIFA-Match (73+i): 0=M73 … 15=M88.
  const BRACKET = {
    // Achtelfinale  M89:74/77  M90:73/75  M91:76/78  M92:79/80  M93:83/84  M94:81/82  M95:86/88  M96:85/87
    r16: [[1, 4], [0, 2], [3, 5], [6, 7], [10, 11], [8, 9], [13, 15], [12, 14]],
    // Viertelfinale M97:89/90  M98:93/94  M99:91/92  M100:95/96
    qf: [[0, 1], [4, 5], [2, 3], [6, 7]],
    // Halbfinale    M101:97/98  M102:99/100
    sf: [[0, 1], [2, 3]],
    // Finale        M104:101/102
    final: [[0, 1]],
  };

  const ROUNDS = [
    { key: "r32",   label: "Sechzehntelfinale", short: "Sechzehntel", teams: 32, count: 16 },
    { key: "r16",   label: "Achtelfinale",      short: "Achtel",      teams: 16, count: 8 },
    { key: "qf",    label: "Viertelfinale",     short: "Viertel",     teams: 8,  count: 4 },
    { key: "sf",    label: "Halbfinale",        short: "Halb",        teams: 4,  count: 2 },
    { key: "final", label: "Finale",            short: "Finale",      teams: 2,  count: 1 },
  ];

  // ---- Termine / Lock --------------------------------------------------------
  const SCHEDULE = {
    groupStage: "11.–27. Juni 2026",
    r32: "28. Juni – 3. Juli 2026",
    r16: "4.–7. Juli 2026",
    qf: "9.–11. Juli 2026",
    sf: "14.–15. Juli 2026",
    final: "19. Juli 2026 (MetLife Stadium)",
  };
  // Standard-Deadline: Anpfiff des Eröffnungsspiels (wird pro Pool überschrieben).
  const LOCK_AT = "2026-06-11T18:00:00Z";

  // ---- Punkteregeln (frei editierbar) ---------------------------------------
  // Gruppenphase: je Team positionsgenau über alle 4 Plätze (1.–4.).
  //   Rangdifferenz 0 (exakt richtiger Platz)   -> groupExact Punkte
  //   Rangdifferenz genau 1 (ein Platz daneben) -> groupOff1  Punkte (symmetrisch ±1)
  //   Rangdifferenz >= 2                         -> 0 Punkte
  // K.-o.-Phase: WELCHE Teams die Runde erreichen (Mengenvergleich Tipp vs. Realität).
  const SCORING = {
    groupExact: 3,    // Team auf exakt getipptem Gruppenplatz (1=1,2=2,3=3,4=4)
    groupOff1: 1,     // Team genau 1 Platz daneben (höher ODER tiefer)
    groupThird: 1,    // je korrekt getipptem weitergekommenen Gruppendritten (+1)
    // "reach": Punkte je korrekt getipptem Team, das diese Runde erreicht.
    // r16 = Achtelfinale, qf = Viertelfinale, sf = Halbfinale, final = Endspiel.
    reach: { r16: 1, qf: 2, sf: 4, final: 6 },
    champion: 10,     // Weltmeister korrekt (Sieger des Finales)
  };

  // ---- Helfer ----------------------------------------------------------------
  function team(code) { return TEAMS[code] || null; }
  function teamName(code) { return code && TEAMS[code] ? TEAMS[code].name : "—"; }
  function flagUrl(code, size) {
    const t = TEAMS[code];
    if (!t) return "";
    const w = size || 40;
    return `https://flagcdn.com/${w}x${Math.round((w * 3) / 4)}/${t.iso}.png`;
  }

  return {
    TEAMS, GROUPS, GROUP_LETTERS, R32, BRACKET, ROUNDS,
    SCHEDULE, LOCK_AT, SCORING,
    team, teamName, flagUrl,
  };
})();
