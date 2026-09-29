import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 21; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { makeGivens, validGrid, leanLayers, dlxSolve, mrvSolve, optionLayers, median, FILLS };")();
const withFull = process.argv[2] === "full";
for (const f of api.FILLS) {
  const out = {}; let worst = { k: "", ms: 0 };
  for (let k = 0; k < 30; k++) {
    const z = api.makeGivens(f);
    for (const [key, fn] of [["lean", p => api.leanLayers(p, { start: 2, order: "cells" })], ["dlx", api.dlxSolve], ["mrv", api.mrvSolve], ...(withFull && (f === "one" || +f >= 20) ? [["full", api.optionLayers]] : [])]) {
      const t0 = performance.now(), r = fn(z.p), ms = performance.now() - t0;
      (out[key] ??= { ok: 0, ms: [], g: 0 }); if (api.validGrid(r.grid, z.p)) out[key].ok++; out[key].ms.push(ms); if (r.guesses) out[key].g++;
      if (ms > worst.ms) worst = { k: key, ms };
    }
  }
  console.log(`${f.padEnd(3)}: ` + Object.entries(out).map(([k, v]) => `${k} ${v.ok}/30 med ${api.median(v.ms).toFixed(3)} max ${Math.max(...v.ms).toFixed(1)} ms${k === "lean" || k === "full" ? " g" + v.g : ""}`).join(" | "));
}
