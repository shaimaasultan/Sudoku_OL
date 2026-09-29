import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 77; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { makeGivens, validGrid, leanLayers, median };")();
const P = {}; for (const f of ["one", "34", "60"]) { P[f] = []; for (let k = 0; k < 30; k++) P[f].push(api.makeGivens(f)); }
for (const cap of [200, 300000]) for (let K = 2; K <= 9; K++) {
  const line = [];
  for (const f of Object.keys(P)) { const ms = []; let ok = 0;
    for (const z of P[f]) { const reps = 5, t0 = performance.now(); let r; for (let k = 0; k < reps; k++) r = api.leanLayers(z.p, { start: K, order: "cells", cap }); ms.push((performance.now() - t0) / reps); if (api.validGrid(r.grid, z.p)) ok++; }
    line.push(`${f === "one" ? "1/n" : f + "%"} ${api.median(ms).toFixed(3)} ms${ok < 30 ? " INVALID " + (30 - ok) : ""}`); }
  console.log(`cap ${String(cap).padEnd(6)} top ${K}: ${line.join(" | ")}`);
}
