/*
 * node-check.js – schneller Logik-Test ohne Browser.
 * Lädt die reinen JS-Module (data, bracket-core, scoring) in einen Fake-"window"
 * und prüft Dritte-Zuordnung, Baum-Vollständigkeit und Wertung.
 * Aufruf:  node tests/node-check.js
 */
const fs = require("fs");
const path = require("path");
global.window = {};
function load(rel) {
  const code = fs.readFileSync(path.join(__dirname, "..", "assets", "js", rel), "utf8");
  eval.call(global, code);
}
load("data.js");
load("bracket-core.js");
load("scoring.js");

const WM = window.WM, Core = window.WMCore, Scoring = window.Scoring;
let failed = 0;
function ok(cond, msg) { console.log((cond ? "✓" : "✗ FAIL") + " " + msg); if (!cond) failed++; }

// 1) Daten
ok(Object.keys(WM.TEAMS).length === 48, "48 Teams vorhanden");
ok(WM.GROUP_LETTERS.length === 12, "12 Gruppen");
ok(WM.R32.length === 16, "16 Sechzehntelfinal-Partien");

// 2) Dritte-Zuordnung: 8 Dritte -> 8 Slots, alle besetzt, Gruppenregel eingehalten
function buildWithThirds(groupsForThirds) {
  const p = Core.emptyPrediction();
  p.thirds = groupsForThirds.map((g) => WM.GROUPS[g][2]);
  return p;
}
const slotsAllowed = {};
WM.R32.forEach((m) => { if (m.b.t) slotsAllowed[m.id] = m.b.t; });

function testThirds(groups) {
  const p = buildWithThirds(groups);
  const a = Core.assignThirds(p);
  const ids = Object.keys(a);
  const filled = ids.filter((id) => a[id]);
  const allFilled = filled.length === 8;
  // Gruppenregel: zugewiesene Gruppe muss im Slot erlaubt sein
  let ruleOk = true;
  ids.forEach((id) => {
    const code = a[id];
    if (!code) return;
    const grp = WM.team(code).group;
    if (slotsAllowed[id].indexOf(grp) === -1) ruleOk = false;
  });
  return { allFilled, ruleOk };
}
const r1 = testThirds(["A", "B", "C", "D", "E", "F", "G", "H"]);
ok(r1.allFilled && r1.ruleOk, "Dritte A–H: alle 8 Slots gültig besetzt");
const r2 = testThirds(["E", "F", "G", "H", "I", "J", "K", "L"]);
ok(r2.allFilled && r2.ruleOk, "Dritte E–L: alle 8 Slots gültig besetzt");
const r3 = testThirds(["A", "C", "E", "G", "I", "K", "B", "J"]);
ok(r3.allFilled && r3.ruleOk, "Dritte gemischt: alle 8 Slots gültig besetzt");

// 3) Voll ausgefüllter Baum -> progress.complete
function autoComplete(p) {
  Core.normalize(p);
  let b = Core.computeBracket(p);
  b.r32.forEach((m) => { if (m.a) p.ko.r32[m.id] = m.a; });
  Core.normalize(p); b = Core.computeBracket(p);
  b.r16.forEach((m, i) => { if (m.a) p.ko.r16[i] = m.a; });
  Core.normalize(p); b = Core.computeBracket(p);
  b.qf.forEach((m, i) => { if (m.a) p.ko.qf[i] = m.a; });
  Core.normalize(p); b = Core.computeBracket(p);
  b.sf.forEach((m, i) => { if (m.a) p.ko.sf[i] = m.a; });
  Core.normalize(p); b = Core.computeBracket(p);
  if (b.final.a) p.ko.champion = b.final.a;
  Core.normalize(p);
  return p;
}
const full = autoComplete(buildWithThirds(["A", "B", "C", "D", "E", "F", "G", "H"]));
const prog = Core.progress(full);
ok(prog.complete, "Voll ausgefüllter Tipp gilt als komplett (" + JSON.stringify({
  thirds: prog.thirds, r32: prog.r32, r16: prog.r16, qf: prog.qf, sf: prog.sf, champ: prog.champion
}) + ")");

// 4) Wertung
const expectedMax = 12 * 3 + 12 * 2 + 8 * 1 + 16 * 1 + 8 * 2 + 4 * 4 + 2 * 6 + 10; // = 138
const selfScore = Scoring.score(full, full);
ok(selfScore === expectedMax, "Identischer Tipp = Maximalpunkte (" + selfScore + " == " + expectedMax + ")");

const emptyScore = Scoring.score(full, {});
ok(emptyScore === 0, "Leere Ergebnisse = 0 Punkte (keine Default-Fehlpunkte)");

ok(!Scoring.hasResults({}), "hasResults({}) ist false");
ok(Scoring.hasResults(full), "hasResults(voller Baum) ist true");

// 5) Normalisierung: ungültiger Sieger wird entfernt, wenn Teilnehmer wechselt
const p5 = buildWithThirds(["A", "B", "C", "D", "E", "F", "G", "H"]);
Core.normalize(p5);
const part = Core.computeBracket(p5).r32[0];
p5.ko.r32[part.id] = part.a;            // gültig
p5.groups[WM.R32[0].a.r] && null;       // (no-op)
// Ändere Gruppe so, dass Teilnehmer a ein anderer wird -> alter Sieger ungültig
const letter = WM.R32[0].a.r;           // 2. der Gruppe (R32-1 a = 2. Gruppe A)
const arr = p5.groups[letter];
const tmp = arr[1]; arr[1] = arr[3]; arr[3] = tmp; // 2. und 4. tauschen
Core.normalize(p5);
ok(!p5.ko.r32[part.id] || p5.ko.r32[part.id] !== part.a || Core.computeBracket(p5).r32[0].a === part.a,
  "Normalisierung entfernt ungültig gewordene Sieger");

console.log("\n" + (failed === 0 ? "ALLE TESTS BESTANDEN ✅" : failed + " TEST(S) FEHLGESCHLAGEN ❌"));
process.exit(failed === 0 ? 0 : 1);
