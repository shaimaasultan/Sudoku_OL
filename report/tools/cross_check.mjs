// Cross-check: puzzles from each page, solved by each page's own lean function (Speed-page settings: top 2, fewest open cells, cap 300,000).
import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "16", checked: true, options: [] }) };
let s = 2024; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const SP = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { setSize, randomSolution, carve, leanLayers, median, countSolutions };")();
const FG = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html") + "; return { setSize, makeGivens, leanLayers, validGrid };")();
SP.setSize(16); FG.setSize(16);
const sets = [];
{ const P = []; for (let k = 0; k < 6; k++) P.push(SP.carve(SP.randomSolution(), "hard")); sets.push(["Speed page: carved hard (one answer)", P]); }
for (const f of ["43", "40"]) { const P = []; for (let k = 0; k < 6; k++) P.push(FG.makeGivens(f).p); sets.push([`Few Givens: random ${f}%`, P]); }
for (const [name, P] of sets) {
  const giv = P.reduce((a, p) => a + p.filter(Boolean).length, 0) / P.length;
  const uniq = P.map(p => SP.countSolutions(p, 2, 20000)).map(c => c === 1 ? "1" : c === 2 ? "2+" : "?").join(" ");
  const line = [];
  for (const [who, A] of [["Speed page's lean", SP], ["Few Givens page's lean", FG]]) {
    const ms = []; let ok = 0;
    for (const p of P) { const t0 = performance.now(); const r = A.leanLayers(p, { start: 2, order: "cells", cap: 300000 }); ms.push(performance.now() - t0); if (r.grid && FG.validGrid(r.grid, p)) ok++; }
    line.push(`${who}: median ${SP.median(ms).toFixed(2)} ms, slowest ${Math.max(...ms).toFixed(1)} ms, valid ${ok}/${P.length}`);
  }
  console.log(`${name} — ${giv.toFixed(1)} givens (${(100 * giv / 256).toFixed(0)}%), answers per puzzle: ${uniq}\n   ${line.join("\n   ")}`);
}
