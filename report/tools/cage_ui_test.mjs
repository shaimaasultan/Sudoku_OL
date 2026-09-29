// Click through the new speed-test card on the Killer and KenKen pages; screenshot it at phone size.
import { launch } from "./cdp.mjs";
const b = await launch(9350);
await b.viewport(390, 844, 2, true);
for (const [page, size, shot] of [["LayerSudoku-Killer.html", "9", "killer_speed"], ["LayerSudoku-KenKen.html", "6", "kenken_speed"]]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof spRun === 'function'");
  await b.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", e => __errs.push(e.message)); true` });
  await b.eval(`__seed(9); $("size").value = "${size}"; newPuzzle(); true`);
  for (let t = 0; t < 60; t++) { await new Promise(r => setTimeout(r, 500)); if (await b.eval(`!!SOL && $("busy").classList.contains("hidden")`)) break; }
  await b.eval(`$("spOne").click(); true`); await new Promise(r => setTimeout(r, 1500));
  console.log(page, "| one:", await b.eval(`$("spFind").textContent.slice(0, 220)`));
  await b.eval(`$("spCount").value = "5"; $("spRun").click(); true`);
  for (let t = 0; t < 240; t++) { await new Promise(r => setTimeout(r, 1000)); if (await b.eval(`!$("spRun").disabled`)) break; }
  console.log("  status:", await b.eval(`$("spStatus").textContent`));
  console.log("  " + (await b.eval(`[...document.querySelectorAll("#spTbl tr")].map(r => [...r.children].map(c => c.textContent).join(" | ")).join(" ## ")`)).split(" ## ").join("\n  "));
  console.log("  finding:", await b.eval(`$("spFind").textContent`));
  console.log("  errors:", JSON.stringify(await b.eval("__errs")), "| sideways scroll:", await b.eval(`document.documentElement.scrollWidth > 390`));
  const box = await b.eval(`(() => { const a = $("spRun").closest(".card").getBoundingClientRect(); return { x: 0, y: a.top + scrollY - 6, width: 390, height: a.height + 12 }; })()`);
  await b.shot(`C:/Sudoku_shaimaa/report/shots/${shot}.png`, box);
}
b.close();
