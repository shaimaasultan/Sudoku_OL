import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 21; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { makeGivens, validGrid, leanLayers, mrvSolve, median, setSize, randomSolution };")();
const sp = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8"); const spjs = sp.slice(sp.indexOf("<script>") + 8, sp.lastIndexOf("</script>"));
const api2 = new Function(spjs + "; return { carve, setSize, randomSolution };")(); api2.setSize(9);
const P = {}; for (const f of ["one", "5", "10", "20", "30", "40", "60"]) { P[f] = []; for (let k = 0; k < 30; k++) P[f].push(api.makeGivens(f)); }
// also hard unique puzzles (as in the Speed page) to be sure a small cap does not hurt them
P.hard = []; for (let k = 0; k < 30; k++) { const sol = api2.randomSolution(); const p = api2.carve(sol, "hard"); P.hard.push({ p, sol }); }
for (const cap of [300000, 20000, 5000, 1000, 200, 50]) {
  const line = [];
  for (const f of Object.keys(P)) { const ms = []; let ok = 0;
    for (const z of P[f]) { const t0 = performance.now(); let r; for (let k = 0; k < 5; k++) r = api.leanLayers(z.p, { start: 2, order: "cells", cap }); ms.push((performance.now() - t0) / 5); if (api.validGrid(r.grid, z.p)) ok++; }
    line.push(`${f} ${api.median(ms).toFixed(3)}${ok < 30 ? " BAD" + ok : ""}`); }
  console.log(`cap ${String(cap).padEnd(6)} | ` + line.join(" | "));
}
const line = []; for (const f of Object.keys(P)) { const ms = P[f].map(z => { const t0 = performance.now(); for (let k = 0; k < 5; k++) api.mrvSolve(z.p); return (performance.now() - t0) / 5; }); line.push(`${f} ${api.median(ms).toFixed(3)}`); }
console.log("MRV        | " + line.join(" | "));
