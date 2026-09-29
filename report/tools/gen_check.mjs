import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "utf8");
let js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
// count backtracking steps in randomSolution
js = js.replace("function randomSolution() {", "let RS = 0; function randomSolution() { RS = 0;").replace("  const rec = () => {\n    let best = -1, bc = 99, bmask = 0;", "  const rec = () => { if (++RS > 2e6) throw new Error('randomSolution: 2M steps'); \n    let best = -1, bc = 99, bmask = 0;");
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "" }) };
const api = new Function(js.split("\r\n").join("\n") + "; return { setSize, randomSolution, carve, getRS: () => RS };")();
api.setSize(16);
for (let k = 0; k < 40; k++) {
  let t0 = performance.now(), sol;
  try { sol = api.randomSolution(); } catch (e) { console.log(k, "SOLUTION STUCK:", e.message, ((performance.now() - t0) / 1000).toFixed(1), "s"); continue; }
  const t1 = performance.now(); api.carve(sol, "medium"); const t2 = performance.now();
  console.log(k, "solution", (t1 - t0).toFixed(0), "ms (", api.getRS(), "steps) carve", (t2 - t1).toFixed(0), "ms");
}
