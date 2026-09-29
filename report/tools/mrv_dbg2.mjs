import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "9", checked: true, options: [] }) };
const A = new Function(js + "; return { setSize, makeGivens, mrvSolve, validGrid, leanLayers, leanLayersDyn, get BR() { return BR; }, get BC() { return BC; }, get N() { return N; } };")();
A.setSize(9);
for (const first of ["none", "leanLayers", "leanLayersDyn"]) {
  const z = A.makeGivens("34"), before = JSON.stringify(z.p);
  if (first === "leanLayers") A.leanLayers(z.p, { start: 2, order: "cells", cap: 200 });
  if (first === "leanLayersDyn") A.leanLayersDyn(z.p, { start: 2, order: "cells", cap: 200, capHi: 300000 });
  const r = A.mrvSolve(z.p);
  console.log(`after ${first}: puzzle unchanged ${JSON.stringify(z.p) === before} | N=${A.N} BR=${A.BR} BC=${A.BC} | MRV nodes ${r.nodes}, valid ${A.validGrid(r.grid, z.p)}`);
}
