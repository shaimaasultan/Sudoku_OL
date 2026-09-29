// Print report.html to PDF with page numbers (headless Edge).
import { launch } from "./cdp.mjs";
const out = process.argv[2] || "C:/Sudoku_shaimaa/report/OptionLayers_Report.pdf";
const b = await launch(9337);
await b.open("C:/Sudoku_shaimaa/report/report.html", "[...document.images].every(i => i.complete)");
await b.pdf(out, {
  displayHeaderFooter: true,
  headerTemplate: "<span></span>",
  footerTemplate: `<div style="font: 8px Segoe UI, Arial; color: #777; width: 100%; padding: 0 17mm; display: flex; justify-content: space-between;"><span>Option Layers and Cuts — Shaimaa Said Soltan</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`,
});
console.log("pdf", out);
b.close();
