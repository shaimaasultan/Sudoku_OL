import { launch } from "./cdp.mjs";
const b = await launch(9354);
const wait = async () => { for (let t = 0; t < 300; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) return; } };
for (const [page, setup] of [["LayerSudoku-Speed.html", `__seed(8); $("size").value = "9"; $("level").value = "hard"; $("count").value = "10"; $("orderBy").value = "tight"; $("run").click(); true`],
                             ["LayerSudoku-FewGivens.html", `__seed(8); $("fill").value = "34"; $("count").value = "10"; $("orderBy").value = "tight"; $("run").click(); true`]]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof leanLayers === 'function'");
  await b.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", e => __errs.push(e.message)); true` });
  await b.eval(setup); await wait();
  console.log(page, "|", await b.eval(`$("status").textContent`), "| lean row:", await b.eval(`[...document.querySelectorAll("#tbl tr")][1] ? [...[...document.querySelectorAll("#tbl tr")][1].children].slice(0, 3).map(c => c.textContent).join(" | ") : "none"`), "| menu has tight:", await b.eval(`[...$("orderBy").options].some(o => o.value === "tight")`), "| errors:", JSON.stringify(await b.eval("__errs")));
}
b.close();
