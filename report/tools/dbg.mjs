import { launch } from "./cdp.mjs";
const b = await launch(9339);
await b.open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", "typeof leanLayers === 'function'");
const r = await b.eval(`(() => { __seed(506); setSize(6); const out=[]; for (let k=0;k<5;k++){ let t0=performance.now(); const sol=randomSolution(); const p=carve(sol,"hard"); const tc=performance.now()-t0; t0=performance.now(); const r=leanLayers(p,{start:2,order:"repeat"}); out.push({tc:+tc.toFixed(1), lean:+(performance.now()-t0).toFixed(2), ok:!!r.grid}); t0=performance.now(); optionLayers(p); out[k].full=+(performance.now()-t0).toFixed(2); t0=performance.now(); dlxSolve(p); out[k].dlx=+(performance.now()-t0).toFixed(2);} return out; })()`);
console.log(JSON.stringify(r)); b.close();
