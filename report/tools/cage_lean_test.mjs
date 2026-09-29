// Test the lean engine added to the Killer and KenKen pages: correctness against the solution, and speed vs the page's method and backtracking.
import { launch } from "./cdp.mjs";
const b = await launch(9349);
for (const [page, plan] of [["LayerSudoku-Killer.html", [[6, 0, 20], [9, 0, 12], [9, 10, 8]]], ["LayerSudoku-KenKen.html", [[4, 0, 20], [5, 0, 20], [6, 0, 15], [7, 0, 10]]]]) {
  await b.open("C:/Sudoku_shaimaa/" + page, "typeof leanSolve === 'function' && typeof makePuzzle === 'function'");
  for (const [n, pct, count] of plan) {
    const r = await b.eval(`(() => { __seed(${300 + n + pct});
      const med = a => { const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
      const res = { lean: [], lean3: [], full: [], bt: [], stress: 0 }; let made = 0, bad = [];
      for (let k = 0; k < ${count}; k++) {
        const m = makePuzzle(${n}, ${n > 6 ? 12000 : 6000}); if (!m) continue; made++;
        const init = new Int8Array(${n * n}); if (${pct}) shuffle([...Array(${n * n}).keys()]).slice(0, Math.round(${n * n} * ${pct} / 100)).forEach(i => init[i] = m.sol[i]);
        const ok = g => !!g && g.every((v, i) => v === m.sol[i]);
        for (const [key, f] of [["lean", () => leanSolve(m.P, init, { start: 2 })], ["lean3", () => leanSolve(m.P, init, { start: 3 })], ["full", () => { const t = killerSolve(m.P, init, { emit: false, limit: 1 }); return { grid: t.sols[0], guesses: t.st.guesses }; }], ["bt", () => cageBacktrack(m.P, init)]]) {
          const { res: x, ms } = spTime(f); res[key].push({ ms, ok: ok(x.grid), g: x.guesses || 0 }); if (!ok(x.grid)) bad.push(key + "#" + k);
        }
        if (ok(leanSolve(m.P, init, { start: 2, cap: 3 }).grid)) res.stress++; else bad.push("stress#" + k);
      }
      const sum = k => { const a = res[k]; return k + " " + a.filter(x => x.ok).length + "/" + a.length + " med " + spFmt(med(a.map(x => x.ms))) + " max " + spFmt(Math.max(...a.map(x => x.ms))) + (k.startsWith("lean") || k === "full" ? " guessed " + a.filter(x => x.g).length : ""); };
      return made + " puzzles | " + ["lean", "lean3", "full", "bt"].map(sum).join(" | ") + " | stress (cap 3) " + res.stress + "/" + made + (bad.length ? " | WRONG: " + bad.join(",") : ""); })()`);
    console.log(`${page.replace("LayerSudoku-", "").replace(".html", "")} ${n}x${n}${pct ? " " + pct + "% givens" : ""}: ${r}`);
  }
}
b.close();
