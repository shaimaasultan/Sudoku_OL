"""Charts for the Option Layers report — reads ../data/*.json, writes ../fig/*.png (and prints key numbers)."""
import json, os, statistics as st
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

D = os.path.join(os.path.dirname(__file__), "..", "data")
F = os.path.join(os.path.dirname(__file__), "..", "fig")
os.makedirs(F, exist_ok=True)
C = {"ol": "#2455c7", "olp": "#8fb0ff", "lb": "#e08a00", "mrv": "#6a6e77", "dlx": "#2e9e57", "single": "#b0a080", "bt": "#6a6e77", "dp": "#6a6e77",
     "A": "#2e9e57", "B": "#2f7fd8", "C": "#e0a020", "D": "#d0453a", "simple": "#9aa0aa", "descent": "#2455c7", "cell": "#e08a00"}
plt.rcParams.update({"font.family": "Segoe UI", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.alpha": .25, "figure.dpi": 150, "savefig.bbox": "tight", "axes.titleweight": "bold", "axes.titlesize": 11})
def load(n):
    p = os.path.join(D, n + ".json")
    return json.load(open(p)) if os.path.exists(p) else None
def med(a): return st.median(a) if a else float("nan")
def q(a, x): return float(np.percentile(a, x)) if a else float("nan")
def save(fig, name): fig.savefig(os.path.join(F, name + ".png")); plt.close(fig); print("fig", name)
NUM = {}

# ---------------- Sudoku: givens sweep ----------------
S = load("sudoku_givens")
if S:
    rows, Ks = S["rows"], S["Ks"]
    by = {k: [r for r in rows if r["givens"] == k] for k in Ks}
    NUM["sudoku_n"] = len(rows); NUM["sudoku_ok"] = all(r["ol"]["ok"] and r["mrv"]["ok"] and r["dlx"]["ok"] for r in rows)
    NUM["sudoku_noguess"] = sum(1 for r in rows if not r["ol"]["guesses"]); NUM["sudoku_pairs_noguess"] = sum(1 for r in rows if not r["olPairs"]["guesses"])
    NUM["sudoku_group_used"] = sum(1 for r in rows if r["ol"]["group"])
    # F1 options built
    fig, ax = plt.subplots(figsize=(6.2, 3.4))
    for key, lab, col in [("ol", "Option layers (+3/4 group check)", C["ol"]), ("olPairs", "Option layers, pairs only", C["olp"])]:
        m = [med([r[key]["built"] for r in by[k]]) for k in Ks]; lo = [q([r[key]["built"] for r in by[k]], 25) for k in Ks]; hi = [q([r[key]["built"] for r in by[k]], 75) for k in Ks]
        ax.plot(Ks, m, "-o", color=col, label=lab, ms=4); ax.fill_between(Ks, lo, hi, color=col, alpha=.15)
    ax.set_yscale("log"); ax.set_xlabel("givens"); ax.set_xticks(Ks); ax.set_ylabel("option layers built (median, IQR)"); ax.set_title("Work grows as givens go down"); ax.legend(frameon=False)
    save(fig, "f_sudoku_built")
    # F2 levels
    fig, ax = plt.subplots(figsize=(6.2, 3.2)); bottom = np.zeros(len(Ks))
    for lv, lab in [("A", "A · layer propagation (papers) finishes"), ("B", "B · + singles finish"), ("C", "C · option layers, no guess"), ("D", "D · option layers need a guess")]:
        v = np.array([100 * sum(1 for r in by[k] if r["level"] == lv) / len(by[k]) for k in Ks]); ax.bar(Ks, v, bottom=bottom, color=C[lv], width=1.5, label=lab); bottom += v
    ax.set_xlabel("givens"); ax.set_xticks(Ks); ax.set_ylabel("% of puzzles"); ax.set_title("Difficulty level by number of givens"); ax.legend(frameon=False, fontsize=8, ncol=2, loc="upper center", bbox_to_anchor=(.5, -.18))
    save(fig, "f_sudoku_levels")
    # F3 effort
    fig, ax = plt.subplots(figsize=(6.2, 3.4))
    for key, f, lab, col in [("mrv", "nodes", "MRV backtracking — nodes", C["mrv"]), ("dlx", "nodes", "Dancing Links (Algorithm X) — nodes", C["dlx"]), ("layerBuilder", "back", "Layer Builder — go-backs", C["lb"])]:
        ax.plot(Ks, [max(.5, st.mean([r[key][f] for r in by[k]])) for k in Ks], "-o", ms=4, color=col, label=lab)
    ax.plot(Ks, [max(.5, st.mean([r["olPairs"]["guesses"] for r in by[k]])) for k in Ks], "--o", ms=4, color=C["olp"], label="Option layers, pairs only — guesses")
    ax.plot(Ks, [max(.5, st.mean([r["ol"]["guesses"] for r in by[k]])) for k in Ks], "-o", ms=4, color=C["ol"], label="Option layers + group check — guesses")
    ax.set_yscale("log"); ax.set_xlabel("givens"); ax.set_xticks(Ks); ax.set_ylabel("average count (log; 0 drawn at 0.5)"); ax.set_title("Trial and error: search nodes vs guesses"); ax.legend(frameon=False, fontsize=8)
    save(fig, "f_sudoku_effort")
    # F4 time
    fig, ax = plt.subplots(figsize=(6.2, 3.4))
    for key, lab, col in [("ol", "Option layers", C["ol"]), ("layerBuilder", "Layer Builder", C["lb"]), ("mrv", "MRV backtracking", C["mrv"]), ("dlx", "Dancing Links", C["dlx"])]:
        ax.plot(Ks, [max(.05, med([r[key]["ms"] for r in by[k]])) for k in Ks], "-o", ms=4, color=col, label=lab)
    ax.set_yscale("log"); ax.set_xlabel("givens"); ax.set_xticks(Ks); ax.set_ylabel("median time per puzzle (ms)"); ax.set_title("Raw speed (browser, one core)"); ax.legend(frameon=False, fontsize=8)
    save(fig, "f_sudoku_time")
    # F5 pairs vs group
    fig, ax = plt.subplots(figsize=(6.2, 3.0)); x = np.arange(len(Ks))
    ax.bar(x - .2, [100 * sum(1 for r in by[k] if r["olPairs"]["guesses"]) / len(by[k]) for k in Ks], .4, color=C["olp"], label="pairs only")
    ax.bar(x + .2, [100 * sum(1 for r in by[k] if r["ol"]["guesses"]) / len(by[k]) for k in Ks], .4, color=C["ol"], label="+ 3/4-number group check")
    ax.set_xticks(x, Ks); ax.set_xlabel("givens"); ax.set_ylabel("% puzzles needing a guess"); ax.set_title("The group check removes the guesses"); ax.legend(frameon=False)
    save(fig, "f_sudoku_pairs_group")
    for k in Ks:
        NUM[f"sud_{k}"] = dict(built=med([r["ol"]["built"] for r in by[k]]), ms=med([r["ol"]["ms"] for r in by[k]]), mrv=st.mean([r["mrv"]["nodes"] for r in by[k]]), dlx=st.mean([r["dlx"]["nodes"] for r in by[k]]), lbback=st.mean([r["layerBuilder"]["back"] for r in by[k]]),
                               pairsGuess=sum(1 for r in by[k] if r["olPairs"]["guesses"]), group=sum(1 for r in by[k] if r["ol"]["group"]), lv={lv: sum(1 for r in by[k] if r["level"] == lv) for lv in "ABCD"},
                               msMrv=med([r["mrv"]["ms"] for r in by[k]]), msDlx=med([r["dlx"]["ms"] for r in by[k]]), msLb=med([r["layerBuilder"]["ms"] for r in by[k]]))

# ---------------- Sudoku: sizes ----------------
Z = load("sudoku_sizes")
if Z:
    ns = sorted(set(r["n"] for r in Z)); fig, ax = plt.subplots(figsize=(6.2, 3.2))
    for key, lab, col in [("ol", "Option layers", C["ol"]), ("mrv", "MRV backtracking", C["mrv"]), ("dlx", "Dancing Links", C["dlx"])]:
        ax.plot(ns, [med([r[key]["ms"] for r in Z if r["n"] == n]) for n in ns], "-o", ms=4, color=col, label=lab)
    ax.set_yscale("log"); ax.set_xticks(ns, [f"{n}×{n}" for n in ns]); ax.set_ylabel("median time (ms)"); ax.set_title("Board size (hard puzzles)"); ax.legend(frameon=False)
    save(fig, "f_sudoku_sizes")
    NUM["sizes"] = {n: dict(k=len([r for r in Z if r["n"] == n]), ol=med([r["ol"]["ms"] for r in Z if r["n"] == n]), mrv=med([r["mrv"]["ms"] for r in Z if r["n"] == n]), dlx=med([r["dlx"]["ms"] for r in Z if r["n"] == n]),
                        guesses=sum(r["ol"]["guesses"] for r in Z if r["n"] == n), noguess=sum(1 for r in Z if r["n"] == n and not r["ol"]["guesses"]), built=med([r["ol"]["built"] for r in Z if r["n"] == n]),
                        mrvNodes=st.mean([r["mrv"]["nodes"] for r in Z if r["n"] == n]), ok=all(r["ol"]["ok"] for r in Z if r["n"] == n)) for n in ns}

# ---------------- all puzzle types: guess-free share + time ----------------
types = []
def add(name, rows, olkey="ol", base=None, basename=""):
    if not rows: return
    types.append(dict(name=name, n=len(rows), noguess=100 * sum(1 for r in rows if not r[olkey]["guesses"]) / len(rows), ok=all(r[olkey]["ok"] for r in rows),
                      ol=med([r[olkey]["ms"] for r in rows]), base=med([r[base]["ms"] for r in rows]) if base else None, basename=basename,
                      baseok=all(r[base].get("ok", True) for r in rows) if base else None))
if S: add("Sudoku 9×9", S["rows"], base="dlx", basename="Dancing Links")
L = load("latin"); add("Latin squares", L, base="mrv", basename="MRV")
K = load("killer"); add("Killer Sudoku", K, base="bt", basename="cage MRV")
KK = load("kenken"); add("KenKen", KK, base="bt", basename="cage MRV")
SB = load("starbattle"); add("Star Battle", SB, base="bt", basename="row backtracking")
Q = load("queens"); add("N-Queens (givens)", Q, base="bt", basename="row backtracking")
NG = load("nonogram"); add("Nonograms", NG, base="dp", basename="DP line solver")
if types:
    NUM["types"] = types
    fig, ax = plt.subplots(figsize=(6.2, 3.0)); y = np.arange(len(types))
    ax.barh(y, [t["noguess"] for t in types], color=C["ol"]); ax.set_yticks(y, [f'{t["name"]} ({t["n"]})' for t in types]); ax.invert_yaxis(); ax.set_xlim(0, 100)
    for i, t in enumerate(types): ax.text(t["noguess"] - 2, i, f'{t["noguess"]:.0f}%', va="center", ha="right", color="white", fontweight="bold", fontsize=9)
    ax.set_xlabel("% solved with no guess"); ax.set_title("Option layers: guess-free across puzzle types"); ax.grid(axis="y", visible=False)
    save(fig, "f_types_noguess")
    fig, ax = plt.subplots(figsize=(6.2, 3.2)); x = np.arange(len(types))
    ax.bar(x - .2, [max(.05, t["ol"]) for t in types], .4, color=C["ol"], label="Option layers"); ax.bar(x + .2, [max(.05, t["base"]) for t in types], .4, color=C["bt"], label="classic baseline")
    ax.set_yscale("log"); ax.set_xticks(x, [t["name"].replace(" (givens)", "") for t in types], rotation=25, ha="right", fontsize=8); ax.set_ylabel("median ms per puzzle"); ax.set_title("Speed against a classic baseline"); ax.legend(frameon=False); ax.set_ylim(bottom=.04)
    save(fig, "f_types_time")

# ---------------- Nonograms detail ----------------
if NG:
    grp = sorted(set((r["n"], r["density"]) for r in NG))
    NUM["nono"] = [dict(n=n, d=d, k=len(rs), olG=sum(r["ol"]["guesses"] for r in rs), dpG=sum(r["dp"]["guesses"] for r in rs), probeUsed=sum(1 for r in rs if r["ol"]["probes"]), olMs=med([r["ol"]["ms"] for r in rs]), dpMs=med([r["dp"]["ms"] for r in rs]), dpNoGuess=sum(1 for r in rs if not r["dp"]["guesses"]))
                   for (n, d) in grp for rs in [[r for r in NG if r["n"] == n and r["density"] == d]]]
    fig, ax = plt.subplots(figsize=(6.2, 3.0)); x = np.arange(len(grp))
    ax.bar(x - .2, [100 * sum(1 for r in NG if (r["n"], r["density"]) == g and not r["dp"]["guesses"]) / max(1, sum(1 for r in NG if (r["n"], r["density"]) == g)) for g in grp], .4, color=C["dp"], label="DP line solver")
    ax.bar(x + .2, [100 * sum(1 for r in NG if (r["n"], r["density"]) == g and not r["ol"]["guesses"]) / max(1, sum(1 for r in NG if (r["n"], r["density"]) == g)) for g in grp], .4, color=C["ol"], label="Option layers (+ all lines together)")
    ax.set_xticks(x, [f"{n}×{n}\n{'sparse' if d < .5 else 'dense' if d > .6 else 'medium'}" for n, d in grp], fontsize=8); ax.set_ylabel("% solved with no guess"); ax.set_ylim(0, 118); ax.set_title("Nonograms: line logic vs option layers"); ax.legend(frameon=False, fontsize=8, loc="upper center", ncol=2)
    save(fig, "f_nonogram")

# ---------------- Map colouring ----------------
M = load("map")
if M:
    Rs = sorted(set(r["R"] for r in M))
    NUM["map"] = [dict(R=R, k=len(rs), opt={c: sum(1 for r in rs if r["opt"] == c) for c in (2, 3, 4, 5)}, greedyWorse=sum(1 for r in rs if r["greedy"] > r["opt"]), optMs=med([r["optMs"] for r in rs]),
                       btMs=med([r["proofBT"]["ms"] for r in rs if r["proofBT"]]), btNodes=st.mean([r["proofBT"]["nodes"] for r in rs if r["proofBT"]]), btAborted=sum(1 for r in rs if r["proofBT"] and r["proofBT"]["aborted"]),
                       guesses=st.mean([r["guesses"] for r in rs]), ratio=[r["count"]["works"] / r["count"]["all"] for r in rs if r.get("count") and r["count"]["done"]]) for R in Rs for rs in [[r for r in M if r["R"] == R]]]
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 3.0))
    ax = axs[0]; bottom = np.zeros(len(Rs))
    for c, col in [(3, "#8fb0ff"), (4, C["ol"]), (5, C["D"])]:
        v = np.array([100 * sum(1 for r in M if r["R"] == R and r["opt"] == c) / sum(1 for r in M if r["R"] == R) for R in Rs]); ax.bar([str(R) for R in Rs], v, bottom=bottom, color=col, label=f"{c} colors"); bottom += v
    ax.set_xlabel("regions"); ax.set_ylabel("% of maps"); ax.set_title("Fewest colors (proved)"); ax.set_ylim(0, 122); ax.legend(frameon=False, fontsize=7.5, ncol=3, loc="upper center")
    ax = axs[1]
    ax.bar([str(R) for R in Rs], [100 * sum(1 for r in M if r["R"] == R and r["greedy"] > r["opt"]) / sum(1 for r in M if r["R"] == R) for R in Rs], color=C["lb"])
    ax.set_xlabel("regions"); ax.set_ylabel("% of maps"); ax.set_title("DSATUR greedy used too many")
    save(fig, "f_map")

# ---------------- Star Cost ----------------
SC = load("starcost")
if SC:
    ex, he = SC["exact"], SC["heur"]
    HK = ["cheapestFirst", "lock3", "lock6", "randDownhill", "anneal", "greedyUnstick", "lock6Unstick"]
    for r, h in zip(ex, he):   # best known = lowest cost any method found (exact runs may time out with no answer)
        cands = [r[k]["best"] for k in ("simple_unit", "descent_unit", "descent_cell")] + [h[k]["cost"] for k in HK]
        h["best"] = r["bestKnown"] = min(c for c in cands if c)
    kinds = []
    for r in ex:
        k = (r["N"], r["K"]);
        if k not in kinds: kinds.append(k)
    lab = [f"{n}×{n}, {k} star" + ("s" if k > 1 else "") for n, k in kinds]
    fig, axs = plt.subplots(1, 2, figsize=(7.4, 3.1)); x = np.arange(len(kinds))
    for j, (key, name, col) in enumerate([("simple_unit", "simple bound", C["simple"]), ("descent_unit", "weight descent", C["descent"]), ("descent_cell", "descent + cheapest-cell branch", C["cell"])]):
        axs[0].bar(x + (j - 1) * .27, [100 * sum(1 for r in ex if (r["N"], r["K"]) == kd and r[key]["proved"]) / sum(1 for r in ex if (r["N"], r["K"]) == kd) for kd in kinds], .27, color=col, label=name)
        axs[1].bar(x + (j - 1) * .27, [med([r[key]["ms"] for r in ex if (r["N"], r["K"]) == kd]) for kd in kinds], .27, color=col)
    axs[0].set_xticks(x, lab, rotation=20, fontsize=8); axs[0].set_ylabel("% proved cheapest (8 s)"); axs[0].set_title("Exact: proofs"); axs[0].set_ylim(0, 128); axs[0].set_yticks(range(0, 101, 20)); axs[0].legend(frameon=False, fontsize=7, loc="upper center", ncol=2)
    axs[1].set_xticks(x, lab, rotation=20, fontsize=8); axs[1].set_yscale("log"); axs[1].set_ylabel("median ms"); axs[1].set_title("Exact: time")
    save(fig, "f_cost_exact")
    meths = [("cheapestFirst", "cheapest-first"), ("lock3", "lock + look 3"), ("lock6", "lock + look 6"), ("randDownhill", "random + downhill ×5"), ("anneal", "simulated annealing"), ("greedyUnstick", "greedy + unstick"), ("lock6Unstick", "lock 6 + unstick")]
    NUM["cost_heur"] = {}
    fig, ax = plt.subplots(figsize=(7.2, 3.3)); w = .8 / len(meths)
    for j, (key, name) in enumerate(meths):
        gaps = []
        for kd in kinds:
            rs = [h for h in he if (h["N"], h["K"]) == kd and h[key]["cost"]]
            gaps.append(st.mean([100 * (h[key]["cost"] - h["best"]) / h["best"] for h in rs]) if rs else 0)
        NUM["cost_heur"][key] = dict(zip(lab, gaps))
        ax.bar(x + (j - len(meths) / 2 + .5) * w, gaps, w, label=name, color=plt.cm.viridis(j / (len(meths) - 1)))
    ax.set_xticks(x, lab, fontsize=8); ax.set_ylabel("% above the best known"); ax.set_title("Heuristics: how far from the cheapest"); ax.set_ylim(0, max(ax.get_ylim()[1], 1) * 1.3); ax.legend(frameon=False, fontsize=7, ncol=4, loc="upper center")
    for i, l in enumerate(lab):
        if all(abs(NUM["cost_heur"][k][l]) < 1e-9 for k, _ in meths): ax.text(i, 1, "all at\nthe best", ha="center", fontsize=7, color="#444")
    save(fig, "f_cost_heur")
    NUM["cost_exact"] = {l: {key: dict(proved=sum(1 for r in ex if (r["N"], r["K"]) == kd and r[key]["proved"]), n=sum(1 for r in ex if (r["N"], r["K"]) == kd), ms=med([r[key]["ms"] for r in ex if (r["N"], r["K"]) == kd]), nodes=med([r[key]["nodes"] for r in ex if (r["N"], r["K"]) == kd]),
                                  fail=0, lbgap=st.mean([100 * (r["bestKnown"] - r[key]["lb0"]) / r["bestKnown"] for r in ex if (r["N"], r["K"]) == kd])) for key in ("simple_unit", "descent_unit", "descent_cell")} for kd, l in zip(kinds, lab)}
    NUM["cost_heur_ms"] = {key: {l: med([h[key]["ms"] for h in he if (h["N"], h["K"]) == kd]) for kd, l in zip(kinds, lab)} for key, _ in meths}
# ---------------- Lean option layers: speed ----------------
LN = load("lean")
if LN:
    groups = []
    for r in LN:
        g = (r["n"], r["level"])
        if g not in groups: groups.append(g)
    lab = [f"{n}×{n}\n{lv}" for n, lv in groups]
    meths = [("lean", "Lean option layers", "#2455c7"), ("full", "Full option layers", "#8a5cc7"), ("dlx", "Dancing Links", C["dlx"]), ("mrv", "MRV backtracking", C["mrv"])]
    fig, ax = plt.subplots(figsize=(7.2, 3.4)); x = np.arange(len(groups)); w = .2
    for j, (key, name, col) in enumerate(meths):
        ax.bar(x + (j - 1.5) * w, [med([r["ms"] for r in LN if (r["n"], r["level"]) == g and r["method"] == key]) for g in groups], w, color=col, label=name)
    ax.set_yscale("log"); ax.set_xticks(x, lab, fontsize=8); ax.set_ylabel("median time per puzzle (ms)"); ax.set_title("Lean option layers: build · cut · AND only")
    ax.set_ylim(top=ax.get_ylim()[1] * 8); ax.legend(frameon=False, fontsize=7.5, ncol=4, loc="upper center")
    save(fig, "f_lean_speed")
    fig, ax = plt.subplots(figsize=(6.2, 3.0))
    for key, name, col in meths[1:]:
        ratios = [med([o["ms"] for o in LN if (o["n"], o["level"]) == g and o["method"] == key]) / med([o["ms"] for o in LN if (o["n"], o["level"]) == g and o["method"] == "lean"]) for g in groups]
        ax.plot(range(len(groups)), ratios, "-o", ms=4, color=col, label=f"{name} ÷ lean")
    ax.axhline(1, color="#999", lw=1, ls="--"); ax.set_yscale("log"); ax.set_xticks(range(len(groups)), lab, fontsize=8)
    ax.set_ylabel("times slower than lean (median)"); ax.set_title("How much faster the lean method is"); ax.legend(frameon=False, fontsize=8)
    save(fig, "f_lean_ratio")
    NUM["lean"] = []
    for g in groups:
        row = dict(n=g[0], level=g[1])
        for key in ("lean", "lean3", "leanCells", "full", "dlx", "mrv"):
            rs = [r for r in LN if (r["n"], r["level"]) == g and r["method"] == key]
            if not rs: continue
            ms = [r["ms"] for r in rs]
            row[key] = dict(k=len(rs), ok=sum(1 for r in rs if r["ok"]), med=med(ms), avg=st.mean(ms), max=max(ms), guessed=sum(1 for r in rs if r["guesses"]),
                            built=med([r["built"] for r in rs]) if rs[0]["built"] is not None else None, layers=st.mean([r["layers"] for r in rs]) if rs[0]["layers"] is not None else None)
        row["givens"] = st.mean([r["givens"] for r in LN if (r["n"], r["level"]) == g and r["method"] == "lean"])
        row["leanFastestOn"] = sum(1 for k in range(row["lean"]["k"]) if all(next(r["ms"] for r in LN if (r["n"], r["level"]) == g and r["method"] == "lean" and r["k"] == k) <= next(r["ms"] for r in LN if (r["n"], r["level"]) == g and r["method"] == m and r["k"] == k) for m in ("full", "dlx", "mrv")))
        NUM["lean"].append(row)

# ---------------- Lean: line chart on a linear scale, by board size (hard puzzles) ----------------
if LN:
    sizes = sorted(set(r["n"] for r in LN))
    def medms(n, key): return med([r["ms"] for r in LN if r["n"] == n and r["level"] == "hard" and r["method"] == key])
    meths = [("lean", "Lean OL (most repeated first)", "#2455c7", "o", "-"), ("leanCells", "Lean OL (fewest open cells first)", "#6fa8ff", "o", ":"), ("dlx", "Dancing Links (Algorithm X)", C["dlx"], "s", "-"), ("mrv", "MRV backtracking", C["mrv"], "^", "-"), ("full", "Full option layers", "#8a5cc7", "D", "--")]
    fig, axs = plt.subplots(1, 2, figsize=(7.6, 3.6))
    for ax, keys, title in [(axs[0], ["lean", "dlx", "mrv", "full"], "All methods"), (axs[1], ["lean", "leanCells", "dlx", "mrv"], "Lean vs the classic solvers (zoom)")]:
        for key, name, col, mk, ls in meths:
            if key not in keys: continue
            ys = [medms(n, key) for n in sizes]
            ax.plot(sizes, ys, ls, marker=mk, ms=5, lw=2.2 if key == "lean" else 1.6, color=col, label=name)
            if key in ("lean", "leanCells") and ax is axs[1]:
                for n, y in zip(sizes, ys):
                    if n >= max(sizes[-2], 12): ax.annotate(f"{y:.2f} ms", (n, y), textcoords="offset points", xytext=(-6, 8) if key == "lean" else (6, -12), ha="right" if key == "lean" else "left", fontsize=7.5, color=col, fontweight="bold")
        ax.set_xticks(sizes, [str(n) for n in sizes]); ax.set_xlabel("board size N (N×N, hard puzzles)"); ax.set_ylabel("median time per puzzle (ms)"); ax.set_title(title); ax.set_ylim(bottom=0)
    axs[0].legend(frameon=False, fontsize=7.5, loc="upper left"); axs[1].legend(frameon=False, fontsize=7, loc="upper left")
    save(fig, "f_lean_linear")

json.dump(NUM, open(os.path.join(D, "_numbers.json"), "w"), indent=1, default=str)
print("numbers saved")
