import { launch } from "./cdp.mjs";
const b = await launch(9345);
await b.viewport(860, 1000, 2, false);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof drawLines === 'function'");
const wait = async () => { for (let t = 0; t < 900; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) return; } };
const table = sel => b.eval(`[...document.querySelectorAll("${sel} tr")].map(r => [...r.children].map(c => c.textContent).join(" | ")).join(" ## ")`);
// single size 30x30
let t0 = Date.now();
await b.eval(`__seed(12); $("size").value = "30"; $("level").value = "hard"; $("count").value = "10"; $("run").click(); true`); await wait();
console.log(`30x30 x10 in ${((Date.now() - t0) / 1000).toFixed(0)} s:`, await b.eval(`$("status").textContent`)); console.log((await table("#tbl")).split(" ## ").join("\n"));
await b.eval(`$("board").scrollIntoView(); true`);
const c1 = await b.eval(`(() => { const a = $("board").closest(".card").getBoundingClientRect(); return { x: a.left - 6, y: a.top + scrollY - 6, width: a.width + 12, height: a.height + 12 }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_30board.png", c1);
// all sizes
t0 = Date.now();
await b.eval(`__seed(13); $("count").value = "30"; $("runAll").click(); true`); await wait();
console.log(`all sizes in ${((Date.now() - t0) / 1000).toFixed(0)} s:`, await b.eval(`$("status").textContent`)); console.log((await table("#tblAll")).split(" ## ").join("\n"));
const c2 = await b.eval(`(() => { const a = $("outAll").getBoundingClientRect(); return { x: a.left - 6, y: a.top + scrollY - 6, width: a.width + 12, height: a.height + 12 }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/speed_lines_all.png", c2);
b.close();
