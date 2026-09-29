import { launch } from "./cdp.mjs";
const b = await launch(9344);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
const t0 = Date.now();
await b.eval(`$("size").value = "16"; $("level").value = "medium"; $("count").value = "30"; $("startK").value = "2"; $("orderBy").value = "cells";
  for (const k of ["full", "dlx", "mrv"]) $("use_" + k).checked = false; $("use_lean").checked = true; $("run").click(); true`);
for (let t = 0; t < 300; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) break; }
console.log(`finished in ${((Date.now() - t0) / 1000).toFixed(0)} s:`, await b.eval(`$("status").textContent`));
console.log(await b.eval(`[...document.querySelectorAll("#tbl tr")].map(r => [...r.children].map(c => c.textContent).join(" | ")).join(" ## ")`));
b.close();
