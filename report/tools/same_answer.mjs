import { readFileSync } from "node:fs";
const h = readFileSync("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "utf8").split("\r\n").join("\n"); const js = h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>"));
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true, options: [] }) };
let s = 12; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const A = new Function(js + "; return { setSize, makeGivens, validGrid, leanLayers, mrvSolve, dlxSolve, sameGrid };")();
A.setSize(9);
for (const f of ["one", "20", "34", "40", "60", "80"]) {
  let lm = 0, ld = 0, dm = 0, lsol = 0, msol = 0, diffCells = 0, n = 20;
  for (let k = 0; k < n; k++) {
    const z = A.makeGivens(f), L = A.leanLayers(z.p, { start: 2, order: "cells", cap: 200 }).grid, M = A.mrvSolve(z.p).grid, X = A.dlxSolve(z.p).grid;
    if (A.sameGrid(L, M)) lm++; else diffCells += L.filter((v, i) => v !== M[i]).length;
    if (A.sameGrid(L, X)) ld++; if (A.sameGrid(X, M)) dm++;
    if (A.sameGrid(L, z.sol)) lsol++; if (A.sameGrid(M, z.sol)) msol++;
  }
  console.log(`${(f === "one" ? "1/number" : f + "%").padEnd(8)}: lean = MRV on ${String(lm).padStart(2)}/${n}${lm < n ? ` (differing ones differ in ${(diffCells / (n - lm)).toFixed(0)} cells on average)` : ""} | lean = DLX ${ld}/${n} | DLX = MRV ${dm}/${n} | same as the grid the puzzle was cut from: lean ${lsol}/${n}, MRV ${msol}/${n}`);
}
