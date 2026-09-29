// Experiment 10: Star Cost optimisation — exact proofs and heuristics on the same seeded boards.
import { launch } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const b = await launch(9335);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-StarCost.html", "typeof solveCost === 'function' && typeof lockCheapest === 'function'");
await b.eval(`
  window.mkBoard = (N, K, wm) => { let reg = null, sol = null; for (let t = 0; t < 400 && !reg; t++) { sol = placeStars(N, K); if (sol) reg = growRegions(N, K, sol); } return { N, K, reg, w: makeWeights(N, wm), sol, givens: new Int8Array(N * N).fill(-1) }; };
  window.costOf = (Q, c) => c.reduce((a, v, i) => a + (v ? Q.w[i] : 0), 0);
  window.anneal = (Q, start, steps) => { const N = Q.N; let cur = Int8Array.from(start), cost = costOf(Q, cur), best = cost, T = 8;
    for (let s = 0; s < steps; s++, T *= 0.9995) { const S = [...cur.keys()].filter(i => cur[i]); const a = S[Math.floor(Math.random() * S.length)], c2 = S[Math.floor(Math.random() * S.length)];
      const r1 = (a / N) | 0, c1 = a % N, r2 = (c2 / N) | 0, cc = c2 % N; if (r1 === r2 || c1 === cc) continue; const n1 = r1 * N + cc, n2 = r2 * N + c1; if (cur[n1] || cur[n2]) continue;
      if ([Q.reg[a], Q.reg[c2]].sort().join() !== [Q.reg[n1], Q.reg[n2]].sort().join() || touching(n1, n2, N)) continue;
      if (S.some(o => o !== a && o !== c2 && (touching(o, n1, N) || touching(o, n2, N)))) continue;
      const d = Q.w[n1] + Q.w[n2] - Q.w[a] - Q.w[c2]; if (d <= 0 || Math.random() < Math.exp(-d / T)) { cur[a] = cur[c2] = 0; cur[n1] = cur[n2] = 1; cost += d; if (cost < best) best = cost; } }
    return best; };
`);
const exact = [], heur = [];
for (const [N, K, count, budget] of [[8, 1, 20, 8000], [10, 2, 15, 8000], [12, 2, 8, 8000], [12, 3, 8, 8000], [14, 2, 5, 8000]]) {
  for (let k = 0; k < count; k++) {
    const row = await b.eval(`(() => { __seed(${9000 + N * 100 + K * 10 + k}); const Q = mkBoard(${N}, ${K}, "random"); P = Q;
      const res = { N: ${N}, K: ${K} };
      for (const [name, mode] of [["simple_unit", { lagr: false }], ["descent_unit", { lagr: true }], ["descent_cell", { lagr: true, branch: "cell" }]]) {
        const t0 = performance.now(), r = solveCost(Q, { emit: false, budgetMs: ${budget}, ...mode }); res[name] = { proved: r.proved, best: r.bestCost, lb0: r.lb0, nodes: r.st.nodes, pruned: r.st.pruned, ms: performance.now() - t0 }; }
      OPT = res.descent_unit.proved ? solveCost(Q, { emit: false, budgetMs: 8000, lagr: true }) : { ok: true, best: null, bestCost: Math.min(res.simple_unit.best, res.descent_unit.best, res.descent_cell.best), proved: false };
      window.__Q = Q; return res; })()`);
    exact.push(row);
    const h = await b.eval(`(() => { const Q = __Q, t = f => { const t0 = performance.now(); const v = f(); return { cost: v, ms: performance.now() - t0 }; };
      const out = { N: Q.N, K: Q.K, best: OPT.bestCost, proved: OPT.proved };
      const g = solveCost(Q, { emit: false, budgetMs: 3000, branch: "cell", first: true });
      out.cheapestFirst = t(() => solveCost(Q, { emit: false, budgetMs: 3000, branch: "cell", first: true }).bestCost);
      out.lock3 = t(() => lockCheapest(Q, 3).cost); out.lock6 = t(() => lockCheapest(Q, 6).cost);
      out.randDownhill = t(() => { let best = Infinity; for (let s = 0; s < 5; s++) { const s0 = randomStart(Q); if (s0) best = Math.min(best, downhill(Q, s0, false).cost); } return best; });
      out.anneal = t(() => { const s0 = randomStart(Q); return s0 ? anneal(Q, s0, 20000) : null; });
      out.greedyUnstick = t(() => g.best ? unstick(Q, downhill(Q, g.best, false).cur, 12).cost : null);
      out.lock6Unstick = t(() => { const L = lockCheapest(Q, 6); return unstick(Q, L.placement, 12).cost; });
      return out; })()`);
    heur.push(h);
    console.log(`${N}x${N} ${K}★ #${k}: proved ${row.descent_unit.proved} best ${row.descent_unit.best} (simple ${row.simple_unit.proved ? "✓" : "✗"} ${Math.round(row.simple_unit.ms)}ms, descent ${Math.round(row.descent_unit.ms)}ms, cell ${row.descent_cell.proved ? "✓" : "✗"} ${Math.round(row.descent_cell.ms)}ms) | cf ${h.cheapestFirst.cost} lock6 ${h.lock6.cost} down ${h.randDownhill.cost} ann ${h.anneal.cost} unstick ${h.greedyUnstick.cost} lock6+unstick ${h.lock6Unstick.cost}`);
  }
}
writeFileSync("../data/starcost.json", JSON.stringify({ exact, heur }));
b.close();
