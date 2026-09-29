import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 9; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const A = new Function(js + "; return { setSize, randomSolution, leanLayers, dlxSolve, mrvSolve, median, get G() { return G; } };")();
const n = +process.argv[2], fills = process.argv[3].split(","), count = +process.argv[4];
A.setSize(n); const G = A.G, NN = n * n;
const valid = (g, p) => { if (!g) return false; for (let i = 0; i < NN; i++) { if (!(g[i] >= 1 && g[i] <= n)) return false; if (p[i] && g[i] !== p[i]) return false; }
  for (let i = 0; i < NN; i++) for (let j = i + 1; j < NN; j++) if (g[i] === g[j] && (G.R[i] === G.R[j] || G.C[i] === G.C[j] || G.B[i] === G.B[j])) return false; return true; };
for (const f of fills) {
  const P = []; for (let k = 0; k < count; k++) { const sol = A.randomSolution(), p = new Array(NN).fill(0);
    if (f === "one") for (let d = 1; d <= n; d++) { const c = []; for (let i = 0; i < NN; i++) if (sol[i] === d) c.push(i); p[c[Math.floor(Math.random() * c.length)]] = d; }
    else [...Array(NN).keys()].sort(() => Math.random() - 0.5).slice(0, Math.round(NN * +f / 100)).forEach(i => p[i] = sol[i]); P.push(p); }
  const line = [];
  for (const [key, fn] of [["lean200", p => A.leanLayers(p, { start: 2, order: "cells", cap: 200 })], ["leanSpeed", p => A.leanLayers(p, { start: 2, order: "cells", cap: 300000 })], ["dlx", A.dlxSolve], ["mrv", A.mrvSolve]]) {
    const ms = []; let ok = 0; for (const p of P) { const t0 = performance.now(); const r = fn(p); ms.push(performance.now() - t0); if (valid(r.grid, p)) ok++; }
    line.push(`${key} ${A.median(ms).toFixed(2)} max ${Math.max(...ms).toFixed(0)} ms ${ok}/${P.length}`);
  }
  console.log(`${n}x${n} ${f === "one" ? "1/n" : f + "%"}: ${line.join(" | ")}`);
}
