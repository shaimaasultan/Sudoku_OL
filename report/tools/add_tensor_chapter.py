"""Write chapter 9 (tensor engines and Dancing Layers) into report.html from data/tensor.json.
If chapter 9 is already there it is replaced in place; otherwise it is inserted before Discussion and the later chapters are renumbered."""
import json, re
p = "C:/Sudoku_shaimaa/report/report.html"
t = open(p, encoding="utf-8", newline="").read(); nl = "\r\n" if "\r\n" in t else "\n"; t = t.replace("\r\n", "\n")
T = json.load(open("C:/Sudoku_shaimaa/report/data/tensor.json"))

def rep(a, b):
    global t
    assert t.count(a) == 1, a[:60]
    t = t.replace(a, b)

TOC = "    <li>The cube as a tensor, and Dancing Layers</li>\n"
if "<h2>9. The cube as a tensor" in t:
    a0 = t.index('<section class="chap">\n<h2>9. The cube as a tensor'); b0 = t.index('<section class="chap">\n<h2>10. Discussion')
    t = t[:a0] + t[b0:]
    t = re.sub(r"    <li>The cube as a tensor[^<]*</li>\n", "", t)
else:
    for a, b in [("<h2>10. Appendix", "<h2>11. Appendix"), ("<h3>10.1 ", "<h3>11.1 "), ("<h3>10.2 ", "<h3>11.2 "), ("<h3>10.3 ", "<h3>11.3 "),
                 ("<h2>9. Discussion", "<h2>10. Discussion"), ("<h3>9.1 ", "<h3>10.1 "), ("<h3>9.2 ", "<h3>10.2 "), ("<h3>9.3 ", "<h3>10.3 "), ("<h3>9.4 ", "<h3>10.4 ")]:
        rep(a, b)
rep("    <li>Discussion, limits and related work</li>", TOC + "    <li>Discussion, limits and related work</li>")

cols = [("tNum", "Tensor · numbers"), ("tAll", "Tensor · all 4"), ("tUnit", "Tensor · R/C/B"), ("shared", "Shared patterns"), ("dl", "Dancing Layers"),
        ("x2", "Matrix top 2"), ("x3", "Matrix top 3"), ("lean", "Lean OL"), ("dl0", "Exact cover, no templates"), ("dlx", "Dancing Links"), ("mrv", "MRV")]
OL = ["tNum", "tAll", "tUnit", "shared", "dl", "x2", "x3", "lean"]
lab = {"hard": "hard, 1 answer", "20": "random 20%", "34": "random 34%", "40": "random 40%"}
def f(ms): return f"{ms * 1000:.0f} µs" if ms < 0.1 else f"{ms:.2f}" if ms < 10 else f"{ms:.1f}" if ms < 100 else f"{ms:.0f}"
rows = []
for c in T["cases"]:
    M = c["methods"]; olbest = min(M[k]["median"] for k in OL if k in M); best = min(v["median"] for v in M.values())
    cells = []
    for k, _ in cols:
        if k not in M: cells.append('<td class="n">not run</td>'); continue
        v = M[k]; s = f(v["median"]) + (f' <span class="bad">({v["solved"]}/{T["K"]})</span>' if v["solved"] < T["K"] else "")
        if v["median"] == olbest and v["median"] != best: s = "<b>" + s + "</b>"
        cells.append(f'<td class="{"n good" if v["median"] == best else "n"}">{s}</td>')
    rows.append(f'  <tr><td>{c["n"]}×{c["n"]} {lab[c["level"]]}</td><td class="n">{c["givens"]:.0f}</td>' + "".join(cells) + "</tr>")
head = '  <tr><th>Puzzles</th><th class="n">Givens</th>' + "".join(f'<th class="n">{n}</th>' for _, n in cols) + "</tr>"
table = '<table style="font-size:7.6pt">\n' + head + "\n" + "\n".join(rows) + "\n</table>"
g = lambda c, k: f(T["cases"][c]["methods"][k]["median"])
K = T["K"]

chap = f"""<section class="chap">
<h2>9. The cube as a tensor, and Dancing Layers</h2>
<p>The option-layer cube (row × column × number) can be held as one N×N×N true/false <b>tensor</b>: a point is true while that number can still go in that cell. Every rule of Sudoku says "exactly one true point on each line of the cube" — each cell, and each number in each row, column and box. This chapter tests four engines built on that view, on the Tensor Layers page (<code>LayerSudoku-Tensor.html</code>), against the lean engine and the classic solvers.</p>
<h3>9.1 Four engines</h3>
<ul>
  <li><b>Tensor OL.</b> The tensor is kept in four views at once (cell, row, column, box), each line packed into one 32-bit word, so a line with no point (a dead end) or one point (a naked or hidden single) is found in one pass. Layers can be cut in four directions: a <b>number</b> layer (a horizontal slice: the templates of the lean method), or a <b>row</b>, <b>column</b> or <b>box</b> layer (vertical slices: every way to give its open cells different numbers). The thinnest layer in any allowed direction is built next — top 2 at the start, one more when stuck, never all; a layer over the cap (2,000 options) waits until its size bound shrinks 8 times. Cut and AND / OR are the same in every direction: row, column and box layers find naked and hidden sets, number layers find fish patterns.</li>
  <li><b>Matrix OL (matmul).</b> The tensor is one flat 0/1 vector <b>x</b>. The line sums are one product <b>A·x</b> with the fixed line matrix A. All layers of one direction are stacked into one option × point matrix <b>M</b>; one pass is <b>alive = (M·(1−x) = 0)</b> (cut) and <b>count = aliveᵀ·M</b> (count 0 → remove, OR; count = the live options of its layer → place, AND). Every row, column and box layer is built <b>in full</b> at the start; only the top 2 or 3 number layers are built.</li>
  <li><b>Shared number patterns.</b> A template is a pattern — one cell per row, column and box — that does not depend on the number. So the thinnest numbers are built in <b>one</b> walk over the patterns, each pattern kept once with a mask of the numbers it fits. Instead of cutting the lists again, each point keeps a <b>support count</b> (the live patterns that use it) and each number its live count; removing a point touches only the patterns through that cell. Support 0 removes a point; support equal to the live count places it. After a failed guess the changes are undone from a trail, so the list is never scanned or copied again. When stuck, one more number joins the shared set.</li>
  <li><b>Dancing Layers.</b> Dancing Links (exact cover) whose rows are whole templates. For the top 2 numbers whose layer fits the cap, every template is one row covering its N cells and the column "number d"; every other number keeps one row per possible cell (the cell and "d in its row / column / box"). Choosing a row unlinks every clashing template and candidate, and going back links them again — the layers are cached and toggled, never cut, copied or rebuilt. Every step works on the column with the fewest live rows: a cell, a whole number layer, or a number in a row, column or box. The same code with no templates ("exact cover, no templates") is plain Dancing Links on the candidates the givens leave open, and shows what the templates add.</li>
</ul>
<h3>9.2 Results</h3>
<p>{K} seeded puzzles per case, the same puzzles for every method, after a warm-up; fast runs are repeated and averaged. Tensor, shared and Dancing Layers engines: start top 2, cap 2,000. Median time per puzzle in ms; <span class="good">green</span> = fastest overall, <b>bold</b> = fastest option-layer engine where a classic solver was faster; a red fraction = puzzles solved within the 5-million-step limit.</p>
{table}
<figure><img src="fig/f_tensor.png" style="width:100%"><figcaption><b>Figure 9.1.</b> The same medians on a log scale. The matrix engines were not run on 16×16 random 40%: building every row, column and box layer in full is too large on an open 16×16 board. MRV solved 8 of 10 there within its 5-million-step limit. Timings of the slower list-cutting engines differ by up to about 2× between runs; the order between Dancing Layers, the classic solvers and the rest is stable.</figcaption></figure>
<h3>9.3 What the results show</h3>
<ul>
  <li><b>Toggling instead of re-cutting is the biggest gain.</b> On open boards Dancing Layers is far faster than every option-layer engine that cuts and copies its lists: 9×9 random 20% {g(1, "dl")} ms against {g(1, "lean")} (lean) and {g(1, "shared")} (shared patterns); 16×16 random 40% {g(4, "dl")} ms against {g(4, "shared")} (shared) and {g(4, "lean")} (lean). It also beats the Speed page's Dancing Links on 16×16 random 40% ({g(4, "dlx")} ms) and on 9×9 random 34% ({g(2, "dlx")} ms).</li>
  <li><b>Templates help on tight boards, not on open ones.</b> Against the same code with no templates: 9×9 hard {g(0, "dl")} vs {g(0, "dl0")} ms, 9×9 random 34% {g(2, "dl")} vs {g(2, "dl0")}, 16×16 hard {g(3, "dl")} vs {g(3, "dl0")} — but 9×9 random 20% {g(1, "dl")} vs {g(1, "dl0")}, and 16×16 random 40% {g(4, "dl")} vs {g(4, "dl0")}. A template settles N cells in one choice when the lists are short; on open boards the extra rows slow every column choice. With templates for all numbers (top 9) the short checks were several times slower.</li>
  <li><b>16×16 hard (one answer): option-layer engines are fastest.</b> Tensor with all four directions {g(3, "tAll")} ms and shared patterns {g(3, "shared")} ms, against Dancing Links {g(3, "dlx")} and MRV {g(3, "mrv")} ms. On hard puzzles the extra directions pay (tensor with number layers only: {g(3, "tNum")} ms); on open boards they cost (16×16 random 40%: {g(4, "tAll")} vs {g(4, "tNum")} ms).</li>
  <li><b>MRV is still fastest on every 9×9 case</b> ({g(0, "mrv")} on hard puzzles, {g(2, "mrv")} at 34%): with many answers almost any guess works, and MRV guesses cheaply. On 16×16 random 40% it is the slowest ({g(4, "mrv")} ms, 2 of 10 unsolved within 5 million steps).</li>
  <li><b>Shared patterns beat number layers built one at a time</b> on open boards (9×9 random 20%: {g(1, "shared")} vs {g(1, "tNum")} ms; 16×16 random 40%: {g(4, "shared")} vs {g(4, "tNum")}), but every list-cutting engine stays far behind Dancing Layers there.</li>
  <li><b>Building the vertical layers in full (the matrix engines) does not pay on the CPU.</b> They are the slowest or close to it in every case — on 16×16 hard the full lists hold 6,000–21,000 options, and every pass multiplies all of them. Their two products fit a GPU, which would only pay on large boards.</li>
</ul>
<p class="small">Limits: {K} puzzles per case, one machine, Node (V8) rather than the browser; sizes above 16×16 and other fills were not measured. Script: <code>report/tools/exp_tensor.mjs</code>; data: <code>report/data/tensor.json</code>; chart: <code>report/tools/f_tensor.py</code>.</p>
</section>
"""
rep('<section class="chap">\n<h2>10. Discussion', chap + '<section class="chap">\n<h2>10. Discussion')
open(p, "w", encoding="utf-8", newline="").write(t.replace("\n", nl))
print("ok")
