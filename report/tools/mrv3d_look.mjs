import { launch } from "./cdp.mjs";
const b = await launch(9355);
await b.viewport(620, 1400, 2, false);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-MRV3D.html", "typeof mrvTrace === 'function'");
await b.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", e => __errs.push(e.message)); true` });
for (let t = 0; t < 40; t++) { await new Promise(r => setTimeout(r, 300)); if (await b.eval(`!!T && $("busy").classList.contains("hidden")`)) break; }
await b.eval(`$("cubeAuto").checked = false; C3.auto = false; for (let k = 0; k < 12; k++) $("stepBtn").click(); true`);
await new Promise(r => setTimeout(r, 400));
console.log(await b.eval(`$("info").textContent`));
console.log("step:", await b.eval(`$("stepNo").textContent + " — " + $("stepText").textContent`));
// same answer and same count of tries as the page's own replay would give from plain MRV rules
console.log("replay steps:", await b.eval(`T.ev.length`), "| last:", await b.eval(`T.ev.at(-1).kind`), "| errors:", JSON.stringify(await b.eval("__errs")));
const clip = await b.eval(`(() => { const a = $("cube3").closest(".card").getBoundingClientRect(); return { x: a.left - 4, y: a.top + scrollY - 4, width: a.width + 8, height: Math.min(a.height + 8, 1300) }; })()`);
await b.shot("C:/Sudoku_shaimaa/report/shots/mrv3d.png", clip);
b.close();
