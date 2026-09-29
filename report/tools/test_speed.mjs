// Check the Speed page: correctness and timings of the lean engine vs full / DLX / MRV.
import { launch } from "./cdp.mjs";
const b = await launch(9338);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
for (const [n, level, count] of [[4, "hard", 20], [6, "hard", 20], [9, "hard", 30], [9, "medium", 20], [12, "hard", 10], [16, "medium", 6], [16, "hard", 4]]) {
  const r = await b.eval(`(() => { __seed(${500 + n}); setSize(${n}); const out = [];
    const P = []; for (let k = 0; k < ${count}; k++) { const sol = randomSolution(); P.push({ p: carve(sol, "${level}"), sol }); }
    const rows = {};
    const cfg = [["lean2rep", p => leanLayers(p, { start: 2, order: "repeat" })], ["lean3rep", p => leanLayers(p, { start: 3, order: "repeat" })], ["lean2cells", p => leanLayers(p, { start: 2, order: "cells" })], ["lean3cells", p => leanLayers(p, { start: 3, order: "cells" })], ["full", optionLayers], ["dlx", dlxSolve], ["mrv", mrvSolve]];
    for (const [k, f] of cfg) { f(P[0].p); const ms = [], g = [], built = [], lay = []; let ok = 0;
      for (const z of P) { const { res, ms: t } = timeIt(() => f(z.p)); ms.push(t); if (res.grid && res.grid.every((v, i) => v === z.sol[i])) ok++; g.push(res.guesses || 0); built.push(res.built || 0); lay.push(res.layers || 0); }
      rows[k] = { ok: ok + "/" + P.length, med: +median(ms).toFixed(3), avg: +mean(ms).toFixed(3), max: +Math.max(...ms).toFixed(2), guessed: g.filter(x => x > 0).length, built: median(built), layers: +mean(lay).toFixed(1) }; }
    return { givens: mean(P.map(z => z.p.filter(Boolean).length)).toFixed(1), rows }; })()`);
  console.log(`\n== ${n}x${n} ${level} (${count}, avg givens ${r.givens})`);
  for (const [k, v] of Object.entries(r.rows)) console.log(k.padEnd(11), JSON.stringify(v));
}
b.close();
