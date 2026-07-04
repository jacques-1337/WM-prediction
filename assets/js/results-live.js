/*
 * results-live.js – Schnappschuss der ECHTEN Turnier-Ergebnisse als Vorlage
 * für den Admin ("Echte Ergebnisse laden" in admin.html).
 *
 * Quelle: fotmob.com (Liga 77, WM 2026) · Stand: 04.07.2026 (nach dem
 * Sechzehntelfinale; das Achtelfinale beginnt am 04.07. abends).
 *
 * WICHTIG: Die Reihenfolge in "thirds" nicht ändern! Sie ist so gewählt,
 * dass Core.assignThirds exakt die offizielle FIFA-Zuordnung der Dritten
 * zu den Sechzehntelfinal-Slots reproduziert (verifiziert: alle 16 Paarungen
 * und die daraus folgenden Achtelfinals entsprechen dem echten Spielplan).
 *
 * Elfmeterschießen im Sechzehntelfinale: Paraguay schlug Deutschland,
 * Marokko die Niederlande, Ägypten Australien.
 */
window.WM_LIVE_RESULTS = {
  asOf: "04.07.2026",
  source: "https://www.fotmob.com/de/leagues/77/overview/world-cup",
  payload: {
    groups: {
      A: ["MEX", "RSA", "KOR", "CZE"],
      B: ["SUI", "CAN", "BIH", "QAT"],
      C: ["BRA", "MAR", "SCO", "HAI"],
      D: ["USA", "AUS", "PAR", "TUR"],
      E: ["GER", "CIV", "ECU", "CUW"],
      F: ["NED", "JPN", "SWE", "TUN"],
      G: ["BEL", "EGY", "IRN", "NZL"],
      H: ["ESP", "CPV", "URU", "KSA"],
      I: ["FRA", "NOR", "SEN", "IRQ"],
      J: ["ARG", "AUT", "ALG", "JOR"],
      K: ["COL", "POR", "COD", "UZB"],
      L: ["ENG", "CRO", "GHA", "PAN"],
    },
    doneGroups: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"],
    thirds: ["PAR", "SWE", "ECU", "COD", "BIH", "ALG", "SEN", "GHA"],
    ko: {
      r32: {
        "R32-1": "CAN",  // Südafrika 0:1 Kanada
        "R32-2": "PAR",  // Deutschland 1:1 Paraguay (i. E.)
        "R32-3": "MAR",  // Niederlande 1:1 Marokko (i. E.)
        "R32-4": "BRA",  // Brasilien 2:1 Japan
        "R32-5": "FRA",  // Frankreich 3:0 Schweden
        "R32-6": "NOR",  // Elfenbeinküste 1:2 Norwegen
        "R32-7": "MEX",  // Mexiko 2:0 Ecuador
        "R32-8": "ENG",  // England 2:1 DR Kongo
        "R32-9": "USA",  // USA 2:0 Bosnien-H.
        "R32-10": "BEL", // Belgien 3:2 Senegal (n. V.)
        "R32-11": "POR", // Portugal 2:1 Kroatien
        "R32-12": "ESP", // Spanien 3:0 Österreich
        "R32-13": "SUI", // Schweiz 2:0 Algerien
        "R32-14": "ARG", // Argentinien 3:2 Kap Verde (n. V.)
        "R32-15": "COL", // Kolumbien 1:0 Ghana
        "R32-16": "EGY", // Australien 1:1 Ägypten (i. E.)
      },
      r16: {}, qf: {}, sf: {}, champion: null,
    },
  },
};
