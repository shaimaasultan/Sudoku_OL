import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "9", checked: true, options: [] }) };
let s = 9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const A = new Function(js + "; return { setSize, makeGivens, validGrid, leanLayers, leanLayersDyn, mrvSolve, median };")();
const run = (n, f, cnt, withLean) => { A.setSize(n); const P = []; for (let k = 0; k < cnt; k++) P.push(A.makeGivens(f).p);
  const line = [];
  for (const [key, fn] of [...(withLean ? [["lean cap 200", p => A.leanLayers(p, { start: 2, order: "cells", cap: 200 })]] : []), ["dynamic 200→full", p => A.leanLayersDyn(p, { start: 2, order: "cells", cap: 200, capHi: 300000 })], ["MRV", A.mrvSolve]]) {
    const ms = []; let ok = 0; for (const p of P) { const t0 = performance.now(); const r = fn(p); ms.push(performance.now() - t0); if (A.validGrid(r.grid, p)) ok++; }
    line.push(`${key}: ${ok}/${cnt} valid, med ${A.median(ms).toFixed(2)} max ${Math.max(...ms).toFixed(1)} ms`); }
  console.log(`${n}x${n} ${f === "one" ? "1/n" : f + "%"}: ${line.join(" | ")}`); };
for (const f of ["one", "20", "34", "60"]) run(9, f, 10, true);
run(12, "20", 5, false); run(12, "34", 5, false); run(16, "one", 3, false);
