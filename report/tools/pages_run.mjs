import { launch } from "./cdp.mjs";
const b = await launch(9348);
const errs = []; 
for (const [page, setup, doneExpr] of [
  ["LayerSudoku-Givens.html", `__seed(2); $("from").value = "26"; $("to").value = "30"; $("count").value = "10"; $("run").click(); true`, `$("stopBtn").disabled`],
  ["LayerSudoku-Categories.html", `__seed(2); $("count").value = "60"; $("run").click(); true`, `!$("run").disabled`]]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof optionLayers === 'function'");
  await b.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", e => __errs.push(e.message)); true` });
  const t0 = Date.now(); await b.eval(setup); await new Promise(r => setTimeout(r, 1500));
  for (let t = 0; t < 400; t++) { if (await b.eval(doneExpr)) break; await new Promise(r => setTimeout(r, 1000)); }
  const status = await b.eval(`(document.getElementById("status") || {}).textContent || ""`);
  console.log(`${page}: finished in ${((Date.now() - t0) / 1000).toFixed(0)} s — "${status.slice(0, 120)}" — page errors: ${JSON.stringify(await b.eval("__errs"))}`);
}
b.close();
