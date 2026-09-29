import { readFileSync } from "node:fs";
const html = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8");
const js = html.slice(html.indexOf("<script>") + 8, html.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
const api = new Function(js + "; return { makeGivens, validGrid, optionLayers };")();
for (const f of ["one", "10", "20", "30"]) { const ms = []; let ok = 0;
  for (let k = 0; k < 5; k++) { const z = api.makeGivens(f); const t0 = performance.now(); const r = api.optionLayers(z.p); ms.push(performance.now() - t0); if (api.validGrid(r.grid, z.p)) ok++; }
  console.log(f, ok + "/5 valid, times", ms.map(x => x.toFixed(0)).join(", "), "ms"); }
