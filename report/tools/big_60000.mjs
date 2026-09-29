import { readFileSync } from "node:fs";
const html = readFileSync("C:/Users/shaim/AppData/Local/Temp/sp_60000.html", "utf8").split("\r\n").join("\n");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" }) };
let s = 7; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, optionLayers, dlxSolve, mrvSolve, get BR() { return BR; }, get BC() { return BC; } };")();
const n = +process.argv[2], level = process.argv[3], count = +process.argv[4], withFull = process.argv[5] === "full";
api.setSize(n); console.log(`${n}x${n} boxes ${api.BR}x${api.BC}`);
for (let k = 0; k < count; k++) {
  let t0 = performance.now(); const sol = api.randomSolution(); const tg = performance.now() - t0;
  t0 = performance.now(); const p = api.carve(sol, level); const tc = performance.now() - t0;
  const line = [`#${k} grid ${tg.toFixed(0)} ms, carve ${(tc / 1000).toFixed(1)} s, givens ${p.filter(Boolean).length} (${(100 * p.filter(Boolean).length / (n * n)).toFixed(0)}%)`];
  for (const [key, f] of [["lean", q => api.leanLayers(q, { start: 2, order: "cells" })], ["dlx", api.dlxSolve], ["mrv", api.mrvSolve], ...(withFull ? [["full", api.optionLayers]] : [])]) {
    t0 = performance.now(); const r = f(p); const ms = performance.now() - t0;
    line.push(`${key} ${ms.toFixed(1)} ms ${r.grid && r.grid.every((v, i) => v === sol[i]) ? "ok" : "WRONG/none" + (r.aborted ? " (node cap)" : "")}${key === "lean" ? ` g${r.guesses} L${r.layers}` : ""}`);
  }
  console.log("  " + line.join(" | "));
}
