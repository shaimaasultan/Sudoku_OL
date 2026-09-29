import { readFileSync } from "node:fs";
const load = f => { const h = readFileSync(f, "utf8").split("\r\n").join("\n"); return h.slice(h.indexOf("<script>") + 8, h.lastIndexOf("</script>")); };
globalThis.document = { getElementById: () => ({ innerHTML: "", textContent: "", style: {}, classList: { add() {}, remove() {} }, value: "", checked: true }) };
const mk = f => new Function(load(f) + "; return { setSize, randomSolution, carve, leanLayers, median };")();
const OLD = mk("./_speed_old.html"), NEW = mk("C:/Sudoku_shaimaa/LayerSudoku-Speed.html");
let s = 5; Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
for (const [label, n, count, mkp] of [["9x9 hard", 9, 60, "hard"], ["9x9 one per number", 9, 40, "one"], ["16x16 hard", 16, 8, "hard"]]) {
  OLD.setSize(n); NEW.setSize(n);
  const P = []; for (let k = 0; k < count; k++) { const sol = NEW.randomSolution(); let p; if (mkp === "hard") p = NEW.carve(sol, "hard"); else { p = new Array(81).fill(0); for (let d = 1; d <= 9; d++) { const c = [...Array(81).keys()].filter(i => sol[i] === d); p[c[Math.floor(Math.random() * c.length)]] = d; } } P.push(p); }
  for (const cap of [300000, 200]) {
    const o = [], w = [], reps = n > 9 ? 4 : 30; let same = 0;
    for (let round = 0; round < 3; round++) for (const p of P) for (const [impl, arr] of (round % 2 ? [[NEW, w], [OLD, o]] : [[OLD, o], [NEW, w]])) {
      const t0 = performance.now(); let r; for (let k = 0; k < reps; k++) r = impl.leanLayers(p, { start: 2, order: "cells", cap }); arr.push((performance.now() - t0) / reps);
    }
    for (const p of P) { const a = OLD.leanLayers(p, { start: 2, order: "cells", cap }).grid, b = NEW.leanLayers(p, { start: 2, order: "cells", cap }).grid; if (a && b && a.every((v, i) => v === b[i])) same++; }
    const mo = NEW.median(o), mw = NEW.median(w);
    console.log(`${label.padEnd(20)} cap ${String(cap).padEnd(6)}: with bookkeeping ${mo.toFixed(4)} ms, without ${mw.toFixed(4)} ms → ${((1 - mw / mo) * 100).toFixed(1)}% faster; same answer on ${same}/${P.length}`);
  }
}
