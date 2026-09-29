import { launch } from "./cdp.mjs";
const b = await launch(9353);
const wait = async () => { for (let t = 0; t < 600; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("run").disabled`)) return; } };
const tbl = sel => b.eval(`[...document.querySelectorAll("${sel} tr")].map(r => [...r.children].map(c => c.textContent).join(" | ")).join(" ## ")`);
for (const [page, setup] of [["LayerSudoku-Speed.html", `__seed(3); $("size").value = "9"; $("level").value = "hard"; $("count").value = "30"; $("run").click(); true`],
                             ["LayerSudoku-FewGivens.html", `__seed(3); $("fill").value = "34"; $("count").value = "30"; $("run").click(); true`]]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof leanLayers === 'function'");
  await b.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", e => __errs.push(e.message)); true` });
  await b.eval(setup); await wait();
  console.log(`== ${page}: ${await b.eval(`$("status").textContent`)}`);
  console.log((await tbl("#tbl")).split(" ## ").join("\n"));
  console.log((await b.eval(`[...document.querySelectorAll("#find li")].map(l => "- " + l.textContent).join(" ## ")`)).split(" ## ").join("\n"));
  console.log("board cells coloured:", await b.eval(`[...new Set([...document.querySelectorAll("#board div")].map(d => d.className.split(" ")[0]))].join(",")`), "| chips:", JSON.stringify(await b.eval(`($("chips") || {}).textContent || ""`)), "| errors:", JSON.stringify(await b.eval("__errs")));
}
b.close();
