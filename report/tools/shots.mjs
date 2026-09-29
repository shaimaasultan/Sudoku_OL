// Screenshots for the report: phone-sized, fixed seeds, stepped to an interesting moment of each method.
import { launch } from "./cdp.mjs";
const b = await launch(9336);
const W = 390, H = 844, OUT = "C:/Sudoku_shaimaa/report/shots/";
const sleep = ms => new Promise(r => setTimeout(r, ms));
await b.viewport(W, H, 2, true);
// capture the union of the given elements (page coordinates)
async function shotEls(name, sels, pad = 6) {
  const box = await b.eval(`(() => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of ${JSON.stringify(sels)}) { const e = document.querySelector(s); if (!e || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') continue; const r = e.getBoundingClientRect(); x0 = Math.min(x0, r.left + scrollX); y0 = Math.min(y0, r.top + scrollY); x1 = Math.max(x1, r.right + scrollX); y1 = Math.max(y1, r.bottom + scrollY); } return { x: Math.max(0, x0 - ${pad}), y: Math.max(0, y0 - ${pad}), width: Math.min(${W}, x1 - x0 + 2 * ${pad}), height: y1 - y0 + 2 * ${pad} }; })()`);
  await b.shot(OUT + name + ".png", box); console.log("shot", name, JSON.stringify(box));
}
const step = async (n) => { for (let k = 0; k < n; k++) await b.eval(`$("stepBtn").click()`); await sleep(400); };
const tryShot = async (name, fn) => { try { await fn(); } catch (e) { console.log("!! " + name + ": " + e.message.slice(0, 200)); } };

// 1) the game: board + cube view in slice mode
await tryShot("game", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku.html", "typeof cubeSolve === 'function'");
  await shotEls("game_board", ["header", ".board", "#board"]);
  await b.eval(`cubeOpen(true); cube.auto = false; $("cubeMode").value = "slices"; $("cubeMode").dispatchEvent(new Event("change")); cubeGo(Math.min(9, cube.steps.length - 1)); cube.yaw = -0.6; cube.pitch = 0.45; cube.dirty = true; true`);
  await sleep(600);
  await shotEls("game_cube_slices", ["#cubeCanvas", ".cubestep", "#cubeStats"]);
});
// 2) Option Layers page: heat map mid-solve, then cube view of slices
await tryShot("optionlayers", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Templates.html", "typeof solveOptionLayers === 'function'");
  await b.eval(`__seed(11); $("level").value = "hard"; newPuzzle("varied"); true`); await sleep(1500);
  await b.eval(`$("speed").value = "normal"; true`); await step(7);
  await shotEls("ol_board_heat", ["#board", "#nums", ".stats", ".step"]);
  await b.eval(`$("view").value = "cube"; $("view").dispatchEvent(new Event("change")); C3.auto = false; $("cubeAuto").checked = false; true`); await step(12);
  await shotEls("ol_cube_view", ["#cube3", "#nums", ".step"]);
});
// 3) Layer Builder 2 in cube view with option layers
await tryShot("layers2", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Layers_2.html", "typeof olSolver === 'function'");
  await b.eval(`$("method").value = "ol"; $("method").dispatchEvent(new Event("change")); $("view").value = "cube"; $("view").dispatchEvent(new Event("change")); C3.auto = false; true`);
  await step(6); await shotEls("layers2_cube", ["#cube3", "#layers", ".step"]);
});
// 4) Givens Test: charts
await tryShot("givens", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Givens.html", "typeof optionLayers === 'function'");
  await b.eval(`__seed(5); $("from").value = "22"; $("to").value = "40"; $("step").value = "2"; $("count").value = "20"; $("run").click(); true`);
  for (let t = 0; t < 120; t++) { await sleep(1000); if (await b.eval(`$("stopBtn").disabled`)) break; }
  await shotEls("givens_charts", ["#chart1", "#chart2"]);
  await shotEls("givens_findings", ["#find"]);
});
// 5) Nonogram: method mid-run
await tryShot("nonogram", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Nonogram.html", "typeof nonoSolve === 'function'");
  await b.eval(`__seed(3); $("size").value = "15"; randomPuzzle(); true`); await sleep(3500);
  await b.eval(`$("speed").value = "normal"; true`); await step(14);
  await shotEls("nonogram_method", ["#board", ".msg", ".stats"]);
});
// 6) Star Battle: method mid-run (all units together)
await tryShot("starbattle", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-StarBattle.html", "typeof sbSolve === 'function'");
  await b.eval(`__seed(8); $("size").value = "8,1"; fillGivens(); newPuzzle(); true`); await sleep(3000);
  await b.eval(`$("speed").value = "normal"; tick(true); const i = A.ev.findIndex(e => e.kind === "probe"); A.k = i >= 0 ? i : 6; tick(true); true`); await sleep(500);
  await shotEls("starbattle_probe", ["#board", "#units", ".msg"]);
});
// 7) Killer, KenKen, Latin: candidates during the method
for (const [name, file, prep] of [["killer", "LayerSudoku-Killer.html", `__seed(21); $("size").value = "9"; newPuzzle(); true`], ["kenken", "LayerSudoku-KenKen.html", `__seed(22); $("size").value = "6"; newPuzzle(); true`], ["latin", "LayerSudoku-Latin.html", `__seed(23); $("size").value = "7"; newPuzzle(); true`]]) {
  await tryShot(name, async () => {
    await b.open("C:/Sudoku_shaimaa/" + file, "typeof killerSolve === 'function'");
    await b.eval(prep); await sleep(4000);
    await b.eval(`$("speed").value = "normal"; true`); await step(10);
    await shotEls(name + "_method", ["#board", "#units", ".msg"]);
  });
}
// 8) Queens: 12×12 fewest givens, solved by the method
await tryShot("queens", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-Queens.html", "typeof sbSolve === 'function'");
  await b.eval(`__seed(31); $("size").value = "12"; fillGivens(); $("givens").value = "auto"; newPuzzle(); true`); await sleep(3000);
  await b.eval(`$("speed").value = "normal"; for (let k = 0; k < 400; k++) { tick(true); if (A.k >= A.ev.length) break; } true`); await sleep(400);
  await shotEls("queens_solved", ["#board", ".msg"]);
});
// 9) Map colouring: candidate dots mid-proof, and the words + solution
await tryShot("map", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-MapColor.html", "typeof optimize === 'function'");
  await b.eval(`__seed(41); $("regions").value = "16"; newMap(); true`); await sleep(800);
  await b.eval(`$("speed").value = "normal"; true`); await step(6);
  await shotEls("map_dots", ["#map", ".msg"]);
  await b.eval(`$("speed").value = "turbo"; $("solveBtn").click(); true`); await sleep(4000);
  await shotEls("map_words", ["#tries", "#log", ".words", "#solution"]);
  await b.eval(`$("countBtn").click(); true`); await sleep(4000);
  await shotEls("map_count", ["#map", ".msg"]);
});
// 10) Star Cost: weights layer, lock + look ahead, downhill + unstick, proof
await tryShot("starcost", async () => {
  await b.open("C:/Sudoku_shaimaa/LayerSudoku-StarCost.html", "typeof solveCost === 'function'");
  await b.eval(`__seed(51); $("stars").value = "2"; fitSizes(); $("size").value = "10"; fillGivens(); newPuzzle(); true`); await sleep(5000);
  await shotEls("starcost_board", ["#rule", "#board", ".score"]);
  await b.eval(`$("speed").value = "turbo"; $("lockBtn").click(); true`); await sleep(6000);
  await b.eval(`const i = A.ev.findIndex(e => e.kind === "look"); if (i >= 0) { A.k = i; showEvent(A.ev[i]); } true`); await sleep(300);
  await shotEls("starcost_lookahead", ["#board", ".msg"]);
  await b.eval(`$("downBtn").click(); true`); await sleep(9000);
  await shotEls("starcost_unstick", ["#board", ".msg", "#log"]);
  await b.eval(`toPlay(); A.ev = null; $("solveBtn").click(); true`); await sleep(9000);
  await shotEls("starcost_proof", ["#board", ".stats", ".msg"]);
});
b.close();
