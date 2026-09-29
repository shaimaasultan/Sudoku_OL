import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
let s = 31; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const A = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { setSize, randomSolution, carve, leanLayers, median, mrvSolve, dlxSolve };")();
const valid = (g, p, n) => { if (!g) return false; const box = (r, c) => { const [br, bc] = n === 9 ? [3, 3] : null || [0, 0]; return 0; };
  for (let i = 0; i < n * n; i++) if (p[i] && g[i] !== p[i]) return false;
  for (let k = 0; k < n; k++) { const r = new Set(), c = new Set(); for (let j = 0; j < n; j++) { r.add(g[k * n + j]); c.add(g[j * n + k]); } if (r.size !== n || c.size !== n) return false; } return true; };
const sets = [];
for (const [n, cnt] of [[9, 60], [12, 20], [16, 8], [20, 8], [30, 4]]) { A.setSize(n); const P = []; for (let k = 0; k < cnt; k++) { const sol = A.randomSolution(); P.push({ p: A.carve(sol, "hard"), sol }); } sets.push([`${n}x${n} carved hard`, n, P, true]); }
A.setSize(9);
for (const [name, fill] of [["9x9 random 1/number", "one"], ["9x9 random 34%", 28], ["9x9 random 60%", 49]]) { const P = []; for (let k = 0; k < 40; k++) { const sol = A.randomSolution(), p = new Array(81).fill(0); if (fill === "one") { for (let d = 1; d <= 9; d++) { const c = [...Array(81).keys()].filter(i => sol[i] === d); p[c[Math.floor(Math.random() * c.length)]] = d; } } else [...Array(81).keys()].sort(() => Math.random() - 0.5).slice(0, fill).forEach(i => p[i] = sol[i]); P.push({ p, sol }); } sets.push([name, 9, P, false]); }
for (const [name, n, P, unique] of sets) {
  A.setSize(n); const line = [];
  for (const cap of unique ? [300000] : [300000, 200]) for (const rule of ["cells", "repeat", "tight"]) {
    const ms = []; let ok = 0; const reps = n >= 16 ? 2 : 10;
    for (const z of P) { A.leanLayers(z.p, { start: 2, order: rule, cap }); const t0 = performance.now(); let r; for (let k = 0; k < reps; k++) r = A.leanLayers(z.p, { start: 2, order: rule, cap }); ms.push((performance.now() - t0) / reps);
      if (unique ? r.grid && r.grid.every((v, i) => v === z.sol[i]) : valid(r.grid, z.p, n)) ok++; }
    line.push(`${rule}${unique ? "" : " cap " + cap} ${A.median(ms).toFixed(3)}${ok < P.length ? " WRONG " + (P.length - ok) : ""}`);
  }
  const mrv = P.map(z => { const t0 = performance.now(); for (let k = 0; k < 5; k++) A.mrvSolve(z.p); return (performance.now() - t0) / 5; });
  console.log(`${name.padEnd(22)} | ${line.join(" | ")} | MRV ${A.median(mrv).toFixed(3)} ms`);
}
