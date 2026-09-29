import { launch } from "./cdp.mjs";
const b = await launch(9351);
for (const [page, n, count] of [["LayerSudoku-Killer.html", 9, 12], ["LayerSudoku-KenKen.html", 7, 10], ["LayerSudoku-KenKen.html", 6, 15]]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof leanSolve === 'function'");
  const r = await b.eval(`(() => { __seed(${300 + n}); const P = []; for (let k = 0; k < ${count}; k++) { const m = makePuzzle(${n}, 12000); if (m) P.push(m); }
    const med = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
    const out = [];
    for (const cap of [200000, 20000, 5000, 1000, 200]) { const ms = []; let ok = 0, g = 0, built = [];
      for (const m of P) { const init = new Int8Array(${n * n}); const { res, ms: t } = spTime(() => leanSolve(m.P, init, { start: 2, cap })); ms.push(t); if (res.grid && res.grid.every((v, i) => v === m.sol[i])) ok++; if (res.guesses) g++; built.push(res.built); }
      out.push("cap " + cap + ": " + ok + "/" + P.length + " med " + spFmt(med(ms)) + " max " + spFmt(Math.max(...ms)) + " guessed " + g + " built " + med(built)); }
    const bt = P.map(m => spTime(() => cageBacktrack(m.P, new Int8Array(${n * n}))).ms), fu = P.map(m => spTime(() => killerSolve(m.P, new Int8Array(${n * n}), { emit: false, limit: 1 })).ms);
    out.push("backtracking med " + spFmt(med(bt)) + " max " + spFmt(Math.max(...bt)) + " | full med " + spFmt(med(fu)));
    return out.join(" ## "); })()`);
  console.log(`${page} ${n}x${n}:\n   ${r}`);
}
b.close();
