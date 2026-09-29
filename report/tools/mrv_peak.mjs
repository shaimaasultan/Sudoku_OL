import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "9", checked: true, options: [] }) };
let s = 77; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const A = new Function(load("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html") + "; return { setSize, makeGivens, mrvSolve };")();
A.setSize(9);
const med = a => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
console.log("fill      givens  empty  | MRV wasted tries: median  average  worst  | puzzles with 0 wasted");
for (const f of ["one", "10", "20", "25", "30", "34", "40", "45", "50", "60", "70"]) {
  const w = []; let giv = 0;
  for (let k = 0; k < 300; k++) { const z = A.makeGivens(f); giv += z.givens; const empty = 81 - z.givens; const r = A.mrvSolve(z.p); w.push(r.nodes - 1 - empty); }
  console.log(`${(f === "one" ? "1/number" : f + "%").padEnd(9)} ${(giv / 300).toFixed(0).padStart(5)}  ${(81 - giv / 300).toFixed(0).padStart(5)}  | ${String(med(w)).padStart(24)}  ${(w.reduce((a, b) => a + b, 0) / w.length).toFixed(1).padStart(7)}  ${String(Math.max(...w)).padStart(5)}  | ${w.filter(x => x === 0).length}/300`);
}
