// Run the Speed page's script in Node (DOM stubbed) and check the lean engine on many puzzles.
import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
const el = () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", onclick: null, onchange: null });
globalThis.document = { getElementById: el };
let s = 12345; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, optionLayers, median, mean };")();
const plan = [[4, "hard", 200], [6, "hard", 200], [9, "hard", 200], [9, "medium", 100], [12, "hard", 25], [16, "medium", 8], [16, "hard", 5]];
for (const [n, level, count] of plan) {
  api.setSize(n);
  const P = []; for (let k = 0; k < count; k++) { const sol = api.randomSolution(); P.push({ p: api.carve(sol, level), sol }); }
  const cfgs = [["2 rep", { start: 2, order: "repeat" }], ["3 rep", { start: 3, order: "repeat" }], ["2 cells", { start: 2, order: "cells" }], ["3 cells", { start: 3, order: "cells" }]];
  const line = [];
  for (const [name, o] of cfgs) {
    let ok = 0, guessed = 0; const ms = [], layers = [];
    for (const z of P) { const t0 = performance.now(); const r = api.leanLayers(z.p, o); ms.push(performance.now() - t0); if (r.grid && r.grid.every((v, i) => v === z.sol[i])) ok++; if (r.guesses) guessed++; layers.push(r.layers); }
    line.push(`${name}: ${ok}/${count} ok, guessed ${guessed}, layers ${api.mean(layers).toFixed(1)}, med ${api.median(ms).toFixed(2)} ms, max ${Math.max(...ms).toFixed(1)}`);
  }
  let okF = 0; const msF = []; for (const z of P) { const t0 = performance.now(); const r = api.optionLayers(z.p); msF.push(performance.now() - t0); if (r.grid && r.grid.every((v, i) => v === z.sol[i])) okF++; }
  console.log(`== ${n}x${n} ${level} x${count}\n  ` + line.join("\n  ") + `\n  full: ${okF}/${count} ok, med ${api.median(msF).toFixed(2)} ms, max ${Math.max(...msF).toFixed(1)}`);
}
