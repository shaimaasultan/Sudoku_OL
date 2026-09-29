// Quick check of the tensor engine: valid answers, and times next to lean and MRV on the same puzzles (few puzzles, short).
import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "9", checked: true, options: [] }) };
let s = 7; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const eng = readFileSync(process.env.ENG, "utf8");
const A = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html") + "\n" + eng + "; return { setSize, makeGivens, leanLayers, validGrid, mrvSolve, dlxSolve, tensorOL, tensorTrace, matrixOL, matrixTrace, sharedOL, median, carve: typeof carve!=='undefined'?carve:null, randomSolution };")();
const SP = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { carve };")();
const time = f => { const t0 = performance.now(); const r = f(); return [r, performance.now() - t0]; };
const cases = (process.env.CASES || "9:hard,9:34,9:20,16:hard,16:40").split(",");
const M = [["shared cap2k", p => A.sharedOL(p, { top: 3, cap: 2000 })], ["shared cap20k", p => A.sharedOL(p, { top: 3, cap: 20000 })], ["shared cap300k", p => A.sharedOL(p, { top: 3 })], ["tensor all", p => A.tensorOL(p, {})], ["tensor numbers", p => A.tensorOL(p, { dirs: [1, 0, 0, 0] })], ["tensor units", p => A.tensorOL(p, { dirs: [0, 1, 1, 1] })],
  ["lean (Speed)", p => A.leanLayers(p, { start: 2, order: "cells", cap: 300000 })], ["MRV", p => A.mrvSolve(p, 2e6)], ["DLX", p => A.dlxSolve(p, 2e6)]];
const K = +(process.env.K || 6);
for (const cs of cases) {
  const [n, f] = cs.split(":"); A.setSize(+n);
  const P = []; for (let k = 0; k < K; k++) P.push(f === "hard" ? (globalThis.N = +n, (() => { const sol = A.randomSolution(); return new Function("return 0")(), null; })()) : A.makeGivens(f).p);
  if (f === "hard") { /* carve with the Speed page code (same N via its own setSize) */ const SPs = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { setSize, carve, randomSolution };")(); SPs.setSize(+n); for (let k = 0; k < K; k++) P[k] = SPs.carve(SPs.randomSolution(), "hard"); }
  for (const [, fn] of M) for (const p of P.slice(0, 2)) fn(p);   // warm-up
  const out = [];
  for (const [nm, fn] of M) { const ms = []; let ok = 0, gu = 0; for (const p of P) { const [r, t] = time(() => fn(p)); ms.push(t); if (r.grid && A.validGrid(r.grid, p)) ok++; gu += r.guesses || 0; } out.push(`${nm.padEnd(15)} med ${A.median(ms).toFixed(2).padStart(8)} ms  max ${Math.max(...ms).toFixed(1).padStart(8)}  valid ${ok}/${P.length}${(nm.startsWith("tensor") || nm.startsWith("matrix") || nm.startsWith("shared")) ? "  guesses " + gu : ""}`); }
  console.log(`${n}x${n} ${f}\n  ` + out.join("\n  "));
}
{ A.setSize(9); const p = A.makeGivens("34").p; const T = A.matrixTrace(p, { top: 2 }); console.log("matrix trace events", T.ev.length, "ok", T.ok, "kinds", [...new Set(T.ev.map(e => e.kind))].join(",")); }
