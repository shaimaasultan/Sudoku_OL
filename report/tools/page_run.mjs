import { launch } from "./cdp.mjs";
const b = await launch(9340);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
await b.eval(`__seed(7); $("count").value = "30"; $("run").click(); true`);
for (let t = 0; t < 120; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) break; }
console.log(await b.eval(`$("status").textContent`));
console.log(await b.eval(`[...document.querySelectorAll("#find li")].map(l => "- " + l.textContent).join(" ## ")`));
console.log(await b.eval(`[...document.querySelectorAll("#tbl tr")].map(r => [...r.children].map(c => c.textContent).join(" | ")).join(" ## ")`));
await b.viewport(390, 844, 2, true); await b.shot("C:/Sudoku_shaimaa/report/shots/speed_page.png");
b.close();
