// Check the full option-layer engine in the Categories and Givens pages after the "too many options" fix.
// Runs each page's own optionLayers with the real cap and with the cap forced down to 50.
import { launch } from "./cdp.mjs";
const b = await launch(9347);
for (const page of ["LayerSudoku-Categories.html", "LayerSudoku-Givens.html"]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof optionLayers === 'function' && typeof carve === 'function'");
  for (const cap of [400000, 50]) {
    const out = await b.eval(`(() => {
      const src = optionLayers.toString(); if (!src.includes("list.length >= 400000")) return "cap marker missing";
      const f = (0, eval)("(" + src.replace("list.length >= 400000", "list.length >= ${cap}") + ")");
      const res = [];
      for (const [n, count] of [[6, 30], [9, 30], [12, 8], [16, 4]]) {
        __seed(40 + n); N = n; [BR, BC] = boxShape(n);
        let ok = 0, guessed = 0, ms = 0;
        for (let k = 0; k < count; k++) { const sol = variedSolution(), p = carve(sol, "hard"); const t0 = performance.now(); const r = f(p); ms += performance.now() - t0;
          if (r.grid && r.grid.every((v, i) => v === sol[i])) ok++; if (r.guesses) guessed++; }
        res.push(n + "x" + n + ": " + ok + "/" + count + " correct, guessed " + guessed + ", avg " + (ms / count).toFixed(1) + " ms");
      }
      return res.join(" | "); })()`);
    console.log(`${page} cap ${cap}: ${out}`);
  }
}
b.close();
