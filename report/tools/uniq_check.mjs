import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
const fg = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html") + "; return { makeGivens };")();
const sp = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { setSize, countSolutions, randomSolution, carve };")(); sp.setSize(9);
for (const f of ["one", "20", "30", "40", "50", "60", "70"]) {
  let one = 0, many = 0, unknown = 0;
  for (let k = 0; k < 100; k++) { const z = fg.makeGivens(f); const c = sp.countSolutions(z.p, 2, 200000); if (c === 1) one++; else if (c === 2) many++; else unknown++; }
  console.log(`${f.padEnd(3)} random fill: one answer ${one}/100, many ${many}${unknown ? ", unknown " + unknown : ""}`);
}
let giv = 0; for (let k = 0; k < 30; k++) { const p = sp.carve(sp.randomSolution(), "hard"); giv += p.filter(Boolean).length; }
console.log(`Speed page "hard": carved while exactly one answer remains, ${(giv / 30).toFixed(1)} givens on average`);
