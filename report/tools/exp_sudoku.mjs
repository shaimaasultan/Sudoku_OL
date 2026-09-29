// Experiment 1: 9×9 Sudoku, givens 22–40 (step 2), 50 puzzles each, every method on the same seeded puzzles.
import { launch } from "./cdp.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const b = await launch();
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Givens.html", "typeof optionLayers === 'function'");
await b.eval(readFileSync("baselines.js", "utf8"));
await b.eval(`
  N = 9; [BR, BC] = boxShape(9);
  // option layers without the 3/4-number group check (pairs only), for comparison
  window.OL_pairs = eval("(" + optionLayers.toString().replace("const gc = groupCut(S.T, act);", "const gc = null;") + ")");
  window.makeSet = (seed, Ks, need) => {
    __seed(seed); const rows = new Map(Ks.map(k => [k, []])), low = Math.min(...Ks); let trials = 0;
    while (Ks.some(k => rows.get(k).length < need) && trials < need * 200) {
      trials++; const sol = variedSolution(), p = sol.slice(); let g = 81; const want = new Set(Ks.filter(k => rows.get(k).length < need));
      for (const i of shuffle([...Array(81).keys()])) { if (g <= low) break; const v = p[i]; p[i] = 0; if (countSolutions(p, 2, 20000) === 1) { g--; if (want.has(g)) { rows.get(g).push({ p: p.slice(), sol: sol.slice() }); want.delete(g); } } else p[i] = v; }
    }
    return { rows, trials };
  };
  window.measure = (p, sol) => {
    const t = (f) => { const t0 = performance.now(); const r = f(); return [r, performance.now() - t0]; };
    const [O, olMs] = t(() => optionLayers(p.slice()));
    const [O2, ol2Ms] = t(() => OL_pairs(p.slice()));
    const [L, lbMs] = t(() => layerSolve(p.slice()));
    const S1 = logicShare(p.slice()), LM = layerMethod(p.slice());
    const M = BL_mrv(p, 9, 3, 3, false), D = BL_dlx(p, 9, 3, 3, false);
    const ok = g => !!g && g.every((v, i) => v === sol[i]);
    const level = layersComplete(LM) === 9 ? "A" : layersComplete(S1.grid) === 9 ? "B" : !O.guesses ? "C" : "D";
    return { level, singles: S1.share,
      ol: { ok: ok(O.grid), ms: olMs, built: O.built, guesses: O.guesses, group: O.g3 + O.g4, locked: O.lockedBeforeGuess },
      olPairs: { ok: ok(O2.grid), ms: ol2Ms, built: O2.built, guesses: O2.guesses },
      layerBuilder: { ok: L.ok && ok(L.grid), ms: lbMs, back: L.back, tried: L.tried, aborted: L.aborted },
      mrv: { ok: ok(M.grid), ms: M.ms, nodes: M.nodes }, dlx: { ok: ok(D.grid), ms: D.ms, nodes: D.nodes } };
  };
`);
const Ks = [22, 24, 26, 28, 30, 32, 34, 36, 38, 40], NEED = 50, out = [];
const gen = await b.eval(`(() => { const s = makeSet(2026, ${JSON.stringify(Ks)}, ${NEED}); window.SET = s.rows; return { trials: s.trials, counts: [...s.rows].map(([k, v]) => k + ":" + v.length).join(" ") }; })()`);
console.log("generated", JSON.stringify(gen));
for (const k of Ks) {
  const rows = await b.eval(`SET.get(${k}).map(x => ({ givens: ${k}, puzzle: x.p.join(""), ...measure(x.p, x.sol) }))`);
  out.push(...rows);
  const ng = rows.filter(r => !r.ol.guesses).length;
  console.log(k, rows.length, "noGuess", ng, "olMs", (rows.reduce((a, r) => a + r.ol.ms, 0) / rows.length).toFixed(2), "mrvNodes", Math.round(rows.reduce((a, r) => a + r.mrv.nodes, 0) / rows.length), "allOK", rows.every(r => r.ol.ok && r.mrv.ok && r.dlx.ok));
}
writeFileSync("../data/sudoku_givens.json", JSON.stringify({ seed: 2026, Ks, need: NEED, gen, rows: out }));
b.close();
