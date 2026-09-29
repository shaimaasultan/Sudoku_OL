// Experiment 11: lean option layers (build · cut · AND, top-2 start) vs full option layers, Dancing Links, MRV.
// Uses the Speed page's own engines; short solves are repeated and averaged (timeIt).
import { launch } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const b = await launch(9341);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
const rows = [];
for (const [n, level, count] of [[4, "hard", 100], [6, "hard", 100], [9, "medium", 100], [9, "hard", 100], [12, "hard", 30], [16, "medium", 10], [16, "hard", 10], [20, "hard", 20], [30, "hard", 10]]) {
  const t0 = Date.now();
  // make the puzzles first
  await b.eval(`(() => { __seed(${11000 + n * 10 + (level === "hard" ? 1 : 0)}); setSize(${n}); window.PZ = []; for (let k = 0; k < ${count}; k++) { const sol = randomSolution(); PZ.push({ p: carve(sol, "${level}"), sol }); } return PZ.length; })()`);
  for (const [key, fn] of [["lean", `p => leanLayers(p, { start: 2, order: "repeat" })`], ["lean3", `p => leanLayers(p, { start: 3, order: "repeat" })`], ["leanCells", `p => leanLayers(p, { start: 2, order: "cells" })`], ["full", `optionLayers`], ["dlx", `dlxSolve`], ["mrv", `mrvSolve`]]) {
    const r = await b.eval(`(() => { const f = ${fn}; setSize(${n}); f(PZ[0].p); const out = [];
      for (const z of PZ) { const { res, ms } = timeIt(() => f(z.p)); out.push({ ms, ok: !!res.grid && res.grid.every((v, i) => v === z.sol[i]), guesses: res.guesses || 0, built: res.built ?? null, layers: res.layers ?? null, givens: z.p.filter(Boolean).length }); }
      return out; })()`);
    r.forEach((x, k) => rows.push({ n, level, k, method: key, ...x }));
  }
  const pick = m => rows.filter(x => x.n === n && x.level === level && x.method === m).map(x => x.ms).sort((a, c) => a - c);
  const med = a => a[a.length >> 1];
  console.log(`${n}x${n} ${level} x${count} (${Math.round((Date.now() - t0) / 1000)} s): lean ${med(pick("lean")).toFixed(3)} full ${med(pick("full")).toFixed(3)} dlx ${med(pick("dlx")).toFixed(3)} mrv ${med(pick("mrv")).toFixed(3)} ms; ok ${rows.filter(x => x.n === n && x.level === level).every(x => x.ok)}`);
}
writeFileSync("../data/lean.json", JSON.stringify(rows));
// screenshot of the page's own result cards (9×9 hard, 100 puzzles)
b.close(); process.exit(0);
await b.viewport(390, 844, 2, true);
await b.eval(`__seed(7); $("size").value = "9"; $("level").value = "hard"; $("count").value = "100"; $("run").click(); true`);
for (let t = 0; t < 300; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) break; }
const box = await b.eval(`(() => { const a = $("chart1").closest(".card").getBoundingClientRect(), c = $("tbl").closest(".card").getBoundingClientRect(); return { x: 0, y: a.top + scrollY - 4, width: 390, height: c.bottom - a.top + 8 }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_results.png", box);
const box2 = await b.eval(`(() => { const a = $("board").closest(".card").getBoundingClientRect(); return { x: 0, y: a.top + scrollY - 4, width: 390, height: a.height + 8 }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_board.png", box2);
console.log("shots saved");
b.close();
