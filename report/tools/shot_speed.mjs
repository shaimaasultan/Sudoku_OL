import { launch } from "./cdp.mjs";
const b = await launch(9342);
await b.viewport(860, 1000, 2, false);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
await b.eval(`__seed(7); $("size").value = "9"; $("level").value = "hard"; $("count").value = "100"; $("run").click(); true`);
for (let t = 0; t < 300; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) break; }
const clip = sel => b.eval(`(() => { const a = ${sel}.getBoundingClientRect(); return { x: a.left - 6, y: a.top + scrollY - 6, width: a.width + 12, height: a.height + 12 }; })()`);
// chart
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_chart.png", await clip(`$("chart1").closest(".card")`));
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_table.png", await clip(`$("tbl").closest(".card")`));
await b.eval(`(() => { const P = DATA.puzzles; let best = -1; P.forEach((z, k) => { if (!z.res.lean.guesses && z.res.lean.layers >= 5 && (best < 0 || z.givens < P[best].givens)) best = k; }); $("pick").value = best; showPuzzle(); return best; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_board.png", await clip(`$("board").closest(".card")`));
console.log(await b.eval(`$("status").textContent`)); b.close();
