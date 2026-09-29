// Time leanLayers from the Speed page on fixed puzzles (carved hard 9×9, 16×16, and random sparse fills); prints medians.
import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 123; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const api = new Function(js + "; return { setSize, randomSolution, carve, leanLayers, median };")();
const valid = (g, p, n) => { if (!g) return false; for (let i = 0; i < n * n; i++) if (p[i] && g[i] !== p[i]) return false; return true; };
const sets = [];
api.setSize(9); let P = []; for (let k = 0; k < 60; k++) { const sol = api.randomSolution(); P.push({ p: api.carve(sol, "hard"), sol }); } sets.push(["9x9 hard", 9, P]);
for (const [name, frac] of [["9x9 random 34%", 0.34], ["9x9 one per number", 0]]) { const Q = []; for (let k = 0; k < 60; k++) { const sol = api.randomSolution(), p = new Array(81).fill(0); if (frac) [...Array(81).keys()].sort(() => Math.random() - 0.5).slice(0, 28).forEach(i => p[i] = sol[i]); else for (let d = 1; d <= 9; d++) { const c = [...Array(81).keys()].filter(i => sol[i] === d); const i = c[Math.floor(Math.random() * c.length)]; p[i] = d; } Q.push({ p, sol }); } sets.push([name, 9, Q]); }
api.setSize(16); P = []; for (let k = 0; k < 8; k++) { const sol = api.randomSolution(); P.push({ p: api.carve(sol, "hard"), sol }); } sets.push(["16x16 hard", 16, P]);
for (const [name, n, Q] of sets) {
  api.setSize(n); for (const z of Q.slice(0, 3)) api.leanLayers(z.p, { start: 2, order: "cells" });   // warm up
  for (const cap of [300000, 200]) {
    const ms = []; let ok = 0;
    for (const z of Q) { const reps = n > 9 ? 3 : 20, t0 = performance.now(); let r; for (let k = 0; k < reps; k++) r = api.leanLayers(z.p, { start: 2, order: "cells", cap }); ms.push((performance.now() - t0) / reps); if (valid(r.grid, z.p, n)) ok++; }
    console.log(`${name.padEnd(20)} cap ${String(cap).padEnd(6)}: median ${api.median(ms).toFixed(4)} ms, mean ${(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(4)} ms, valid ${ok}/${Q.length}`);
  }
}
