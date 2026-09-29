// Open the Tensor Layers page headless: replay a few steps, take a picture, run a short race (5 puzzles 9x9 hard).
import { launch } from "./cdp.mjs";
const SHOT = process.argv[2];
const b = await launch(9361);
await b.viewport(620, 1500, 2, false);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Tensor.html", "typeof tensorOL === 'function'");
await b.send("Runtime.evaluate", { expression: `window.__errs = []; window.addEventListener("error", e => __errs.push(e.message + " @" + e.lineno)); window.addEventListener("unhandledrejection", e => __errs.push("async: " + (e.reason && e.reason.stack || e.reason))); true` });
const wait = async c => { for (let t = 0; t < 100; t++) { await new Promise(r => setTimeout(r, 300)); if (await b.eval(c)) return; } };
await wait(`!!T && $("busy").classList.contains("hidden")`);
if (process.argv[4]) { await b.eval(`$("engine").value = "${process.argv[4]}"; $("engine").onchange(); $("newBtn").click(); T = null; true`); await wait(`!!T && $("busy").classList.contains("hidden")`); }
console.log(await b.eval(`$("info").textContent`));
console.log("events:", await b.eval(`T.ev.length`), "| kinds:", await b.eval(`[...new Set(T.ev.map(e=>e.kind))].join(",")`));
// step to the first cut event
await b.eval(`$("cubeAuto").checked = false; C3.auto = false; { let k = 0; while (V.k < T.ev.length - 1 && !["cut","matmul"].includes(T.ev[V.k].kind) && k++ < 60) $("stepBtn").click(); } $("vFront").click(); true`);
await new Promise(r => setTimeout(r, 400));
console.log("step:", await b.eval(`$("stepNo").textContent + " — " + $("stepText").textContent`));
console.log("stats:", await b.eval(`[...document.querySelectorAll(".stats b")].map(x=>x.textContent).join(" | ")`));
const clip = await b.eval(`(() => { const a = $("cube3").closest(".card").getBoundingClientRect(); return { x: a.left - 4, y: a.top + scrollY - 4, width: a.width + 8, height: Math.min(a.height + 8, 1400) }; })()`);
await b.shot(SHOT, clip);
await b.eval(`$("endBtn").click(); true`);
console.log("end:", await b.eval(`$("stepNo").textContent + " — " + $("stepText").textContent`));
await b.eval(`$("rCount").value = "5"; $("rLevel").value = process_level; $("raceBtn").click(); true`.replace("process_level", JSON.stringify(process.argv[3] || "hard")));
await wait(`!$("raceBtn").disabled`);
console.log(await b.eval(`$("rStatus").textContent`));
console.log(await b.eval(`[...$("rTbl").rows].map(r => [...r.cells].map(c => c.textContent).join(" | ")).join("  //  ")`));
console.log("errors:", JSON.stringify(await b.eval("__errs")));
b.close();
