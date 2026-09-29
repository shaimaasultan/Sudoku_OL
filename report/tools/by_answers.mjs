// MRV wasted tries grouped by the number of answers a puzzle has (9×9), not by fill.
import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "9", checked: true, options: [] }) };
let s = 91; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const FG = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html") + "; return { setSize, makeGivens, mrvSolve };")();
const SP = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { setSize, countSolutions, randomSolution, carve };")();
FG.setSize(9); SP.setSize(9);
const LIM = 2000, groups = new Map(), key = c => c === 1 ? "exactly 1" : c <= 10 ? "2–10" : c <= 100 ? "11–100" : c <= 1000 ? "101–1,000" : "more than 1,000";
const add = (g, fill, wasted) => { if (!groups.has(g)) groups.set(g, []); groups.get(g).push({ fill, wasted }); };
for (const f of ["30", "34", "40", "45", "50", "60"]) for (let k = 0; k < 150; k++) {
  const z = FG.makeGivens(f), c = SP.countSolutions(z.p, LIM, 3e5); if (c < 0) continue;
  const r = FG.mrvSolve(z.p); add(`random · ${key(c >= LIM ? LIM + 1 : c)}`, +f, r.nodes - 1 - (81 - z.givens));
}
for (let k = 0; k < 150; k++) { const p = SP.carve(SP.randomSolution(), "hard"), giv = p.filter(Boolean).length; const r = FG.mrvSolve(p); add("carved hard · exactly 1", Math.round(100 * giv / 81), r.nodes - 1 - (81 - giv)); }
const med = a => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
const order = ["random · more than 1,000", "random · 101–1,000", "random · 11–100", "random · 2–10", "random · exactly 1", "carved hard · exactly 1"];
console.log("group (answers)                | puzzles | fills seen | MRV wasted tries: median  average  worst");
for (const g of order) { const a = groups.get(g); if (!a) continue; const w = a.map(x => x.wasted), fl = [...new Set(a.map(x => x.fill))].sort((x, y) => x - y);
  console.log(`${g.padEnd(30)} | ${String(a.length).padStart(7)} | ${(fl[0] + "–" + fl.at(-1) + "%").padStart(10)} | ${String(med(w)).padStart(24)}  ${(w.reduce((x, y) => x + y, 0) / w.length).toFixed(1).padStart(7)}  ${String(Math.max(...w)).padStart(5)}`); }
