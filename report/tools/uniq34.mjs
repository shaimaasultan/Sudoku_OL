import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
const fg = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html") + "; return { makeGivens };")();
const sp = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-Speed.html") + "; return { setSize, countSolutions, randomSolution, carve };")(); sp.setSize(9);
const LIMIT = 100000;
for (const f of ["30", "34", "40"]) {
  const counts = []; let capped = 0;
  for (let k = 0; k < 100; k++) { const z = fg.makeGivens(f); const c = sp.countSolutions(z.p, LIMIT, 5e7); if (c < 0 || c >= LIMIT) { capped++; counts.push(LIMIT); } else counts.push(c); }
  counts.sort((a, b) => a - b);
  const q = p => counts[Math.min(99, Math.floor(p * 100))];
  console.log(`${f}% random fill (100 puzzles): one answer ${counts.filter(c => c === 1).length}/100 | answers: smallest ${counts[0]}, 25% ${q(.25)}, median ${q(.5)}, 75% ${q(.75)}, largest ${capped ? "≥" + LIMIT.toLocaleString() + " (" + capped + " puzzles)" : counts[99]}`);
}
let one = 0; for (let k = 0; k < 30; k++) { const p = sp.carve(sp.randomSolution(), "hard"); if (sp.countSolutions(p, 2, 5e6) === 1) one++; }
console.log(`Speed page Hard (30 puzzles): one answer ${one}/30`);
