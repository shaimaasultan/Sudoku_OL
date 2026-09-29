import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" }) };
let s = +process.argv[3] || 1; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, optionLayers, dlxSolve, mrvSolve, countSolutions };")();
const n = +process.argv[2] || 16, count = 100; api.setSize(n);
const fails = { lean: [], full: [], dlx: [], mrv: [] };
for (let k = 0; k < count; k++) {
  const sol = api.randomSolution(), p = api.carve(sol, "hard");
  for (const [key, f] of [["lean", q => api.leanLayers(q, { start: 2, order: "cells" })], ["full", api.optionLayers], ["dlx", api.dlxSolve], ["mrv", api.mrvSolve]]) {
    const t0 = performance.now(), r = f(p), ms = performance.now() - t0;
    const ok = !!r.grid && r.grid.every((v, i) => v === sol[i]);
    if (!ok) fails[key].push({ k, ms: +ms.toFixed(0), gotGrid: !!r.grid, aborted: r.aborted, nodes: r.nodes, guesses: r.guesses, built: r.built, uniq: api.countSolutions(p, 2, 200000) });
  }
}
console.log(JSON.stringify(fails, null, 1));
