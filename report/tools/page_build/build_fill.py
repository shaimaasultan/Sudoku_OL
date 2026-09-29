# Build the Few Givens page from the Speed page's engines + this page's own parts.
# The lean code is copied unchanged; "leanLayersDyn" is a separate function made from a copy of it with the dynamic-cap rule.
D = "C:/Users/shaim/AppData/Local/Temp/claude/C--Sudoku-shaimaa/b09f6499-3f0c-4389-829c-22978eb18a0c/scratchpad/"
src = open("C:/Sudoku_shaimaa/LayerSudoku-Speed.html", encoding="utf-8").read().replace("\r\n", "\n")
head = src[:src.index("<body>")].replace("<title>Option Layers Speed</title>", "<title>Few Givens Race</title>")
head = head.replace("</style>", ".board .sd{box-shadow:inset 0 0 0 999px rgba(217,130,43,.35)}\n</style>")
js = src[src.index("<script>") + len("<script>"):src.rindex("</script>")]
engines = js[:js.index("/* ---------- the full option-layer method")] + js[js.index("/* ---------- classic algorithms ---------- */"):js.index("/* ---------- puzzles ---------- */")]
i = js.index("function randomSolution() {"); k = js.rindex("// a random full grid", 0, i); grid = js[k:js.index("function carve(", i)]

# ---- the dynamic-cap variant: a copy of leanLayers with three changes ----
a = js.index("function leanLayers("); b = js.index("\n/* ---------- ", a)
dyn = js[a:b]
def rep(t, x, y):
    assert t.count(x) == 1, x[:70]; return t.replace(x, y)
dyn = rep(dyn, "function leanLayers(p, opt = {}) {\n  const cap = opt.cap || 300000,",
          "function leanLayersDyn(p, opt = {}) {\n  // dynamic cap: first list a layer only up to the small cap; a layer that was too big is built in full\n"
          "  // (up to capHi) as soon as its size bound — open cells per box multiplied — shows the full list fits\n"
          "  const capLo = opt.cap || 200, capHi = opt.capHi || 300000, lnHi = Math.log(capHi),")
dyn = rep(dyn, "function build(S, d) {", "function build(S, d, cap) {")
dyn = rep(dyn, "      if (S.done[d] || S.T[d] || S.big[d]) continue;", "      if (S.done[d] || S.T[d]) continue;")
dyn = rep(dyn, "      const e = estimate(S, d); if (e < 0) return null;\n", "      const e = estimate(S, d); if (e < 0) return null;\n      if (S.big[d] && e > lnHi) continue;          // still too big: wait until the board has filled more\n")
dyn = rep(dyn, "S.T[d] = out.subarray(0, n * W); S.cnt[d] = n;", "S.T[d] = out.subarray(0, n * W); S.cnt[d] = n; S.big[d] = 0;")
dyn = rep(dyn, "if (!build(S, nx[0])) return false;", "if (!build(S, nx[0], S.big[nx[0]] ? capHi : capLo)) return false;")
dyn = rep(dyn, "for (const d of first) if (!build(S0, d))", "for (const d of first) if (!build(S0, d, capLo))")
dyn = "/* ---------- lean with a dynamic cap (Few Givens page only) ---------- */\n" + dyn + "\n"

page = head + open(D + "fill_body.html", encoding="utf-8").read() + "\n<script>" + engines + dyn + "/* ---------- random full grids ---------- */\n" + grid + "\n" + open(D + "fill_test.js", encoding="utf-8").read() + "</script>\n</body>\n</html>\n"
open("C:/Sudoku_shaimaa/LayerSudoku-FewGivens.html", "w", encoding="utf-8").write(page)
print("written", len(page))
