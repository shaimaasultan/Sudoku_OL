import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
for (const val of ["", "9"]) {
  globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: val, checked: true, options: [] }) };
  const A = new Function(js + "; return { setSize, makeGivens, mrvSolve, validGrid, get BR() { return BR; }, get BC() { return BC; }, get N() { return N; } };")();
  A.setSize(9); const z = A.makeGivens("34"); const r = A.mrvSolve(z.p);
  console.log(`stub value "${val}": N=${A.N} BR=${A.BR} BC=${A.BC} | MRV nodes ${r.nodes}, valid ${A.validGrid(r.grid, z.p)}`);
}
