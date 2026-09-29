// Experiments 2–8: every puzzle page, option layers vs classic baselines, same seeded puzzles.
import { launch } from "./cdp.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const BL = readFileSync("baselines.js", "utf8");
const only = process.argv[2];
const b = await launch(9334);
const save = (name, obj) => writeFileSync(`../data/${name}.json`, JSON.stringify(obj));
const avg = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0;
const run = async (name, fn) => { if (only && only !== name) return; const t0 = Date.now(); try { await fn(); console.log(`== ${name} done in ${((Date.now() - t0) / 1000).toFixed(0)} s`); } catch (e) { console.log(`!! ${name} failed: ${e.message.slice(0, 300)}`); } };

// ---------- 2) Sudoku sizes 4…16 ----------
await run("sudoku_sizes", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Givens.html", "typeof optionLayers === 'function'");
  await b.eval(BL);
  const rows = [];
  for (const [n, count] of [[4, 40], [6, 40], [9, 40], [12, 25], [16, 12]]) {
    const r = await b.eval(`(() => { N = ${n}; [BR, BC] = boxShape(N); __seed(${1000 + n}); const out = [];
      for (let k = 0; k < ${count}; k++) {
        const sol = variedSolution(), p = carve(sol, "hard"); const ok = g => !!g && g.every((v, i) => v === sol[i]);
        const t0 = performance.now(), O = optionLayers(p.slice()), olMs = performance.now() - t0;
        const M = BL_mrv(p, N, BR, BC, false), D = BL_dlx(p, N, BR, BC, false), S1 = logicShare(p.slice());
        out.push({ n: N, givens: p.filter(Boolean).length, singles: S1.share, ol: { ok: ok(O.grid), ms: olMs, built: O.built, guesses: O.guesses, group: O.g3 + O.g4 }, mrv: { ok: ok(M.grid), ms: M.ms, nodes: M.nodes, aborted: M.aborted }, dlx: { ok: ok(D.grid), ms: D.ms, nodes: D.nodes, aborted: D.aborted } });
      } return out; })()`);
    rows.push(...r);
    console.log(n, r.length, "OL ms", avg(r, x => x.ol.ms).toFixed(2), "guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "MRV ms", avg(r, x => x.mrv.ms).toFixed(2), "DLX ms", avg(r, x => x.dlx.ms).toFixed(2), "ok", r.every(x => x.ol.ok));
  }
  save("sudoku_sizes", rows);
});

// ---------- 3) Latin squares ----------
await run("latin", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Latin.html", "typeof killerSolve === 'function' && typeof makePuzzle === 'function'");
  await b.eval(BL);
  const rows = [];
  for (const [n, count] of [[5, 40], [7, 40], [9, 25]]) {
    const r = await b.eval(`(() => { __seed(${2000 + n}); const out = [];
      for (let k = 0; k < ${count}; k++) { const m = makePuzzle(${n}, 6000); if (!m) continue; const p = Array.from(m.P.givens), ok = g => !!g && Array.from(g).every((v, i) => v === m.sol[i]);
        const t0 = performance.now(), O = killerSolve(m.P, m.P.givens, { emit: false, limit: 1 }), olMs = performance.now() - t0;
        const M = BL_mrv(p, ${n}, ${n}, ${n}, true), D = BL_dlx(p, ${n}, ${n}, ${n}, true);
        out.push({ n: ${n}, givens: p.filter(Boolean).length, ol: { ok: ok(O.sols[0]), ms: olMs, built: O.st.listed, guesses: O.st.guesses, probes: O.st.probes }, mrv: { ok: ok(M.grid), ms: M.ms, nodes: M.nodes }, dlx: { ok: ok(D.grid), ms: D.ms, nodes: D.nodes } }); }
      return out; })()`);
    rows.push(...r); console.log("latin", n, r.length, "OL ms", avg(r, x => x.ol.ms).toFixed(2), "guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "MRV nodes", avg(r, x => x.mrv.nodes).toFixed(0), "ok", r.every(x => x.ol.ok && x.mrv.ok));
  }
  save("latin", rows);
});

// cage-aware MRV backtracking for Killer / KenKen
const CAGE_BT = `window.BL_cage = (N, BR, BC, noBoxes, cages, cageOf, init, kind, nodeCap = 3e6, timeCap = 5000) => {
  // MRV backtracking with row/column/box bit masks and running cage sums/products (the classic way to solve Killer / KenKen)
  const NC = N * N, g = Int8Array.from(init), full = (1 << (N + 1)) - 2, box = i => noBoxes ? 0 : Math.floor(((i / N) | 0) / BR) * (N / BC) + Math.floor((i % N) / BC);
  const rm = new Int32Array(N), cm = new Int32Array(N), bm = new Int32Array(N), M = cages.length;
  const used = new Int32Array(M), sum = new Float64Array(M), prod = new Float64Array(M).fill(1), cnt = new Int16Array(M);
  const put = (i, v, s) => { const b = 1 << v, k = cageOf[i]; rm[(i / N) | 0] ^= b; cm[i % N] ^= b; if (!noBoxes) bm[box(i)] ^= b; used[k] ^= b; sum[k] += s * v; prod[k] = s > 0 ? prod[k] * v : prod[k] / v; cnt[k] += s; };
  for (let i = 0; i < NC; i++) if (g[i]) put(i, g[i], 1);
  const fits = (i, v) => { const k = cageOf[i], cg = cages[k], left = cg.cells.length - cnt[k] - 1;
    if (kind === "killer") { if ((used[k] >> v) & 1) return false; const rem = cg.sum - sum[k] - v; return left === 0 ? rem === 0 : rem >= left * (left + 1) / 2 && rem <= left * N; }
    if (cg.op === "=") return v === cg.target;
    if (cg.op === "+") { const s = sum[k] + v; return left === 0 ? s === cg.target : s + left <= cg.target && s + left * N >= cg.target; }
    if (cg.op === "×") { const p = prod[k] * v; return left === 0 ? p === cg.target : cg.target % p === 0; }
    if (left > 0) return true; const o = cg.cells.find(x => x !== i && g[x]); const a = g[o], hi = Math.max(a, v), lo = Math.min(a, v); return cg.op === "−" ? hi - lo === cg.target : hi % lo === 0 && hi / lo === cg.target; };
  let nodes = 0, aborted = false; const t0 = performance.now();
  const rec = () => { if (++nodes > nodeCap || ((nodes & 1023) === 0 && performance.now() - t0 > timeCap)) { aborted = true; return false; }
    let best = -1, bc = 99, opts = null;
    for (let i = 0; i < NC; i++) if (!g[i]) { const m = full & ~(rm[(i / N) | 0] | cm[i % N] | (noBoxes ? 0 : bm[box(i)])), o = []; for (let v = 1; v <= N; v++) if ((m >> v) & 1 && fits(i, v)) o.push(v); if (o.length < bc) { bc = o.length; best = i; opts = o; if (bc < 2) break; } }
    if (best < 0) return true; if (!bc) return false;
    for (const v of opts) { g[best] = v; put(best, v, 1); if (rec()) return true; put(best, v, -1); g[best] = 0; if (aborted) return false; } return false; };
  const ok = rec(); return { ok, grid: ok ? Array.from(g) : null, nodes, ms: performance.now() - t0, aborted }; };`;

// ---------- 4) Killer Sudoku ----------
await run("killer", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Killer.html", "typeof killerSolve === 'function' && typeof makePuzzle === 'function'");
  await b.eval(CAGE_BT);
  const rows = [];
  for (const [n, count] of [[6, 30], [9, 30]]) {
    const r = await b.eval(`(() => { __seed(${3000 + n}); const out = []; const Gm = geometry(${n});
      for (let k = 0; k < ${count}; k++) { const m = makePuzzle(${n}, 12000); if (!m) continue; const ok = g => !!g && Array.from(g).every((v, i) => v === m.sol[i]);
        const t0 = performance.now(), O = killerSolve(m.P, new Int8Array(${n * n}), { emit: false, limit: 1 }), olMs = performance.now() - t0;
        const M = BL_cage(${n}, Gm.BR, Gm.BC, false, m.P.cages, m.P.cageOf, new Int8Array(${n * n}), "killer");
        out.push({ n: ${n}, cages: m.P.cages.length, ol: { ok: ok(O.sols[0]), ms: olMs, built: O.st.listed, guesses: O.st.guesses, probes: O.st.probes }, bt: { ok: ok(M.grid), ms: M.ms, nodes: M.nodes, aborted: M.aborted } }); }
      return out; })()`);
    rows.push(...r); console.log("killer", n, r.length, "OL ms", avg(r, x => x.ol.ms).toFixed(1), "guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "BT ms", avg(r, x => x.bt.ms).toFixed(1), "BT nodes", avg(r, x => x.bt.nodes).toFixed(0), "ok", r.every(x => x.ol.ok));
  }
  save("killer", rows);
});

// ---------- 5) KenKen ----------
await run("kenken", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-KenKen.html", "typeof killerSolve === 'function' && typeof makePuzzle === 'function'");
  await b.eval(CAGE_BT);
  const rows = [];
  for (const [n, count] of [[5, 30], [6, 30], [7, 20]]) {
    const r = await b.eval(`(() => { __seed(${4000 + n}); const out = [];
      for (let k = 0; k < ${count}; k++) { const m = makePuzzle(${n}, 8000); if (!m) continue; const ok = g => !!g && Array.from(g).every((v, i) => v === m.sol[i]);
        const t0 = performance.now(), O = killerSolve(m.P, new Int8Array(${n * n}), { emit: false, limit: 1 }), olMs = performance.now() - t0;
        const M = BL_cage(${n}, ${n}, ${n}, true, m.P.cages, m.P.cageOf, new Int8Array(${n * n}), "kenken");
        out.push({ n: ${n}, cages: m.P.cages.length, ol: { ok: ok(O.sols[0]), ms: olMs, built: O.st.listed, guesses: O.st.guesses, probes: O.st.probes }, bt: { ok: ok(M.grid), ms: M.ms, nodes: M.nodes, aborted: M.aborted } }); }
      return out; })()`);
    rows.push(...r); console.log("kenken", n, r.length, "OL ms", avg(r, x => x.ol.ms).toFixed(1), "guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "BT ms", avg(r, x => x.bt.ms).toFixed(1), "ok", r.every(x => x.ol.ok));
  }
  save("kenken", rows);
});

// ---------- 6) Star Battle ----------
await run("starbattle", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-StarBattle.html", "typeof sbSolve === 'function' && typeof makePuzzle === 'function'");
  await b.eval(BL);
  const rows = [];
  for (const [n, K, count] of [[6, 1, 30], [8, 1, 30], [10, 2, 15]]) {
    const r = await b.eval(`(() => { __seed(${5000 + n}); const out = [];
      for (let k = 0; k < ${count}; k++) { const m = makePuzzle(${n}, ${K}, ${n >= 10 ? 9000 : 4000}); if (!m || !m.unique) continue;
        const t0 = performance.now(), O = sbSolve(m.P, new Int8Array(${n * n}).fill(-1), { emit: true, limit: 1 }), olMs = performance.now() - t0;
        const sol = O.sols[0], okO = !!sol && sol.every((v, i) => v === m.sol[i]);
        const B = BL_starBT(${n}, ${K}, m.P.reg), okB = !!B.stars && B.stars.every(i => m.sol[i] === 1);
        out.push({ n: ${n}, K: ${K}, ol: { ok: okO, ms: olMs, built: O.st.listed, guesses: O.st.guesses, probeSteps: O.ev.filter(e => e.kind === "probe").length }, bt: { ok: okB, ms: B.ms, nodes: B.nodes, aborted: B.aborted } }); }
      return out; })()`);
    rows.push(...r); console.log("star", n, K, r.length, "OL ms", avg(r, x => x.ol.ms).toFixed(1), "guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "BT ms", avg(r, x => x.bt.ms).toFixed(1), "ok", r.every(x => x.ol.ok));
  }
  save("starbattle", rows);
});

// ---------- 7) N-Queens (fewest givens for one solution) ----------
await run("queens", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Queens.html", "typeof sbSolve === 'function' && typeof makePuzzle === 'function'");
  const rows = [];
  for (const [n, count] of [[8, 30], [12, 30], [16, 20], [20, 15], [30, 10]]) {
    const r = await b.eval(`(() => { __seed(${6000 + n}); const out = [];
      const bt = (N, gv) => { const cols = new Uint8Array(N), d1 = new Uint8Array(2 * N), d2 = new Uint8Array(2 * N), fixed = new Int16Array(N).fill(-1); for (let i = 0; i < N * N; i++) if (gv[i] === 1) fixed[(i / N) | 0] = i % N; let nodes = 0, ok = false;
        const rec = r => { if (++nodes > 5e6) return true; if (r === N) { ok = true; return true; } for (let c = 0; c < N; c++) { if (fixed[r] >= 0 && c !== fixed[r]) continue; if (cols[c] || d1[r + c] || d2[r - c + N]) continue; cols[c] = d1[r + c] = d2[r - c + N] = 1; if (rec(r + 1)) return true; cols[c] = d1[r + c] = d2[r - c + N] = 0; } return false; };
        const t0 = performance.now(); rec(0); return { ok, nodes, ms: performance.now() - t0 }; };
      for (let k = 0; k < ${count}; k++) { const m = makePuzzle(${n}, 12000, "auto"); if (!m) continue;
        const t0 = performance.now(), O = sbSolve(m.P, m.P.givens, { emit: false, limit: 1 }), olMs = performance.now() - t0;
        const B = bt(${n}, m.P.givens);
        out.push({ n: ${n}, givens: [...m.P.givens].filter(v => v === 1).length, ol: { ok: !!O.sols[0] && O.sols[0].every((v, i) => v === m.sol[i]), ms: olMs, built: O.st.listed, guesses: O.st.guesses }, bt: B }); }
      return out; })()`);
    rows.push(...r); console.log("queens", n, r.length, "givens", avg(r, x => x.givens).toFixed(1), "OL ms", avg(r, x => x.ol.ms).toFixed(1), "guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "BT ms", avg(r, x => x.bt.ms).toFixed(1), "ok", r.every(x => x.ol.ok));
  }
  save("queens", rows);
});

// ---------- 8) Nonograms ----------
await run("nonogram", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Nonogram.html", "typeof nonoSolve === 'function'");
  await b.eval(BL);
  const rows = [];
  for (const [n, d, count] of [[10, 0.58, 40], [15, 0.58, 30], [20, 0.58, 25], [15, 0.45, 25], [20, 0.68, 25]]) {
    const r = await b.eval(`(() => { __seed(${7000 + n * 7 + Math.round(d * 100)}); const out = []; let tries = 0;
      while (out.length < ${count} && tries < 3000) { tries++;
        const sol = new Uint8Array(${n * n}); for (let i = 0; i < sol.length; i++) sol[i] = Math.random() < ${d} ? 1 : 0;
        const Q = { R: ${n}, C: ${n}, ...cluesOf(sol, ${n}, ${n}) };
        const u = nonoSolve(Q, new Int8Array(${n * n}).fill(-1), { emit: false, limit: 2, maxGuess: 300, noProbe: true }); if (u.st.aborted || u.sols.length !== 1) continue;
        const t0 = performance.now(), O = nonoSolve(Q, new Int8Array(${n * n}).fill(-1), { emit: false, limit: 1 }), olMs = performance.now() - t0;
        const B = BL_nonoDP(Q.rows, Q.cols);
        out.push({ n: ${n}, density: ${d}, ol: { ok: !!O.sols[0] && Array.from(O.sols[0]).every((v, i) => v === sol[i]), ms: olMs, built: O.st.listed, guesses: O.st.guesses, probes: O.st.probes, lines: O.st.built }, dp: { ok: !!B.grid && Array.from(B.grid).every((v, i) => v === sol[i]), ms: B.ms, guesses: B.guesses, aborted: B.aborted } }); }
      return out; })()`);
    rows.push(...r); console.log("nono", n, d, r.length, "OL ms", avg(r, x => x.ol.ms).toFixed(1), "OL guesses", r.reduce((a, x) => a + x.ol.guesses, 0), "DP ms", avg(r, x => x.dp.ms).toFixed(1), "DP guesses", r.reduce((a, x) => a + x.dp.guesses, 0), "ok", r.every(x => x.ol.ok && x.dp.ok));
  }
  save("nonogram", rows);
});

// ---------- 9) Map colouring ----------
await run("map", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-MapColor.html", "typeof optimize === 'function'");
  await b.eval(BL);
  const rows = [];
  for (const [R, count] of [[10, 30], [16, 30], [25, 30], [40, 20], [60, 20]]) {
    const r = await b.eval(`(() => { __seed(${8000 + R}); const out = [];
      for (let k = 0; k < ${count}; k++) { const g = makeMap(${R}); G = g;
        const t0 = performance.now(), o = optimize(g, false, null), optMs = performance.now() - t0;
        const gr = greedy(g), k0 = o.best.k;
        const proof = k0 > 1 ? BL_mapBT(g, k0 - 1) : null;           // plain backtracking proving k-1 impossible
        const guesses = o.tries.reduce((a, t) => a + t.st.guesses, 0);
        let count = null; if (${R} <= 16) { const c = countColorings(k0, new Int8Array(g.R).fill(-1), false, 3000); count = { works: c.n, all: c.all, done: c.done }; }
        out.push({ R: g.R, edges: g.adj.reduce((a, x) => a + x.length, 0) / 2, clique: o.low, greedy: gr.k, opt: k0, optMs, guesses, proofBT: proof ? { ms: proof.ms, nodes: proof.nodes, aborted: proof.aborted } : null, count }); }
      return out; })()`);
    rows.push(...r); console.log("map", R, r.length, "opt", r.map(x => x.opt).join(""), "greedy worse", r.filter(x => x.greedy > x.opt).length, "opt ms", avg(r, x => x.optMs).toFixed(1));
  }
  save("map", rows);
});
b.close();
