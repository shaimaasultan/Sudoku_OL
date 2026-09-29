import { launch } from "./cdp.mjs";
const b = await launch(9346);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
console.log("menu default:", await b.eval(`$("orderBy").value`));
await b.eval(`__seed(5); $("size").value = "9"; $("count").value = "30"; $("run").click(); true`);
for (let t = 0; t < 120; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) break; }
console.log(await b.eval(`$("status").textContent`), "| LEAN =", await b.eval(`JSON.stringify(LEAN)`));
console.log(await b.eval(`[...document.querySelectorAll("#tbl tr")].slice(1).map(r => [...r.children].slice(0, 3).map(c => c.textContent).join(" | ")).join(" ## ")`));
b.close();
