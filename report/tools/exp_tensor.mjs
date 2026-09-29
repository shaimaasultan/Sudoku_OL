// Tensor / shared / matrix engines vs lean, DLX, MRV — same seeded puzzles for every method. Writes ../data/tensor.json.
import { readFileSync, writeFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {}, toggle() {} }, value: "9", checked: true, options: [], addEventListener() {}, children: [] }) };
const seedRng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const P = "C:/Sudoku_shaimaa/report/tools/page_build/";
const A = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "\n" + ["tensor_engine.js", "matrix_engine.js", "shared_engine.js", "dancing_engine.js"].map(f => readFileSync(P + f, "utf8")).join("\n") +
  "; return { setSize, carve, randomSolution, shuffle, leanLayers, mrvSolve, dlxSolve, tensorOL, matrixOL, sharedOL, dancingLayers, median, get N() { return N; } };")();
const valid = (g, p, n) => { if (!g) return false; const box = (r, c) => { const [br, bc] = [0, 0]; return 0; }; for (let i = 0; i < n * n; i++) if (p[i] && g[i] !== p[i]) return false;
  const seen = new Set(); for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) { const v = g[r * n + c]; if (!(v >= 1 && v <= n)) return false; for (const k of [`r${r}:${v}`, `c${c}:${v}`]) { if (seen.has(k)) return false; seen.add(k); } } return true; };
const M = [
  ["tAll", "Tensor · all four directions", p => A.tensorOL(p, { start: 2, cap: 2000 })],
  ["tNum", "Tensor · number layers only", p => A.tensorOL(p, { start: 2, cap: 2000, dirs: [1, 0, 0, 0] })],
  ["tUnit", "Tensor · row/column/box layers", p => A.tensorOL(p, { start: 2, cap: 2000, dirs: [0, 1, 1, 1] })],
  ["shared", "Shared patterns · support counts", p => A.sharedOL(p, { top: 2, cap: 2000 })],
  ["dl", "Dancing Layers · templates as rows (top 2)", p => A.dancingLayers(p, { top: 2, cap: 2000 })],
  ["dl0", "Dancing Layers · no templates", p => A.dancingLayers(p, { top: 0 })],
  ["x2", "Matrix · top 2 + full vertical", p => A.matrixOL(p, { top: 2, cap: 2000 })],
  ["x3", "Matrix · top 3 + full vertical", p => A.matrixOL(p, { top: 3, cap: 2000 })],
  ["lean", "Lean OL (Speed page)", p => A.leanLayers(p, { start: 2, order: "cells", cap: 300000 })],
  ["dlx", "Dancing Links", p => A.dlxSolve(p)],
  ["mrv", "MRV backtracking", p => A.mrvSolve(p)],
];
const CASES = [["9", "hard"], ["9", "20"], ["9", "34"], ["16", "hard"], ["16", "40"]], K = +(process.env.K || 10);
const skip = { "16:40": ["x2", "x3"] };                // full vertical lists on open 16×16: not run
function timeIt(fn) { let t0 = performance.now(); const res = fn(); let ms = performance.now() - t0;
  if (ms < 4) { const reps = Math.min(400, Math.ceil(8 / Math.max(ms, 0.01))); t0 = performance.now(); for (let k = 0; k < reps; k++) fn(); ms = (performance.now() - t0) / reps; } return { res, ms }; }
const out = { K, cases: [] };
for (const [n, lv] of CASES) {
  const key = `${n}:${lv}`; Math.random = seedRng(1000 + +n + (lv === "hard" ? 0 : +lv));
  A.setSize(+n); const puzzles = [];
  for (let k = 0; k < K; k++) { const sol = A.randomSolution(); let p; if (lv === "hard") p = A.carve(sol, "hard"); else { p = new Array(n * n).fill(0); A.shuffle([...Array(n * n).keys()]).slice(0, Math.round(n * n * +lv / 100)).forEach(i => p[i] = sol[i]); } puzzles.push(p); }
  const use = M.filter(m => !(skip[key] || []).includes(m[0]));
  for (const [, , f] of use) f(puzzles[0]);             // warm-up
  const res = {};
  for (const [id, , f] of use) { res[id] = puzzles.map(p => { const t = timeIt(() => f(p)); return { ms: t.ms, ok: valid(t.res.grid, p, +n), gu: t.res.guesses ?? null }; }); }
  const row = { n: +n, level: lv, givens: A.median(puzzles.map(p => p.filter(Boolean).length)), methods: {} };
  for (const [id, name] of use) { const R = res[id]; row.methods[id] = { name, median: A.median(R.map(x => x.ms)), mean: R.reduce((a, x) => a + x.ms, 0) / R.length, max: Math.max(...R.map(x => x.ms)), solved: R.filter(x => x.ok).length, guesses: R[0].gu == null ? null : A.median(R.map(x => x.gu)) }; }
  out.cases.push(row);
  console.log(`${key} (${row.givens} givens): ` + use.map(([id]) => `${id} ${row.methods[id].median.toFixed(3)}${row.methods[id].solved < K ? "!" + row.methods[id].solved : ""}`).join("  "));
}
writeFileSync("C:/Sudoku_shaimaa/report/data/tensor.json", JSON.stringify(out, null, 1));
