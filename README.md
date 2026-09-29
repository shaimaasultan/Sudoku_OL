# Option Layers (OL) — Sudoku and other logic puzzles

A layer-propagation method for Sudoku by **Shaimaa Said Soltan**: *units* are number layers, *options* are the templates of a layer, *cells* are pillars. Layers are built thinnest first, cut, and combined with AND / OR; guessing comes last.

Every page is a single offline HTML file — open it in a browser, nothing is sent anywhere.

## Pages

| Page | What it shows |
|---|---|
| `LayerSudoku.html` | The main option-layer solver |
| `LayerSudoku-Layers.html`, `LayerSudoku-Templates.html` | Layers and templates, with the 3D cube view |
| `LayerSudoku-Speed.html` | Race: full OL, lean OL, Dancing Links, MRV — 4×4 to 30×30 |
| `LayerSudoku-FewGivens.html` | Race on random fills (few givens, many answers) |
| `LayerSudoku-Tensor.html` | The cube as one tensor: layers in four directions, matrix (matmul) version, shared number patterns with support counts; 3D replay and race |
| `LayerSudoku-MRV3D.html` | MRV backtracking replayed in the 3D cube |
| `LayerSudoku-Givens.html`, `LayerSudoku-Categories.html`, `LayerSudoku-Language.html` | Givens tests, puzzle categories, the move language |
| `LayerSudoku-Killer.html`, `-KenKen.html`, `-Latin.html`, `-Queens.html`, `-Nonogram.html`, `-StarBattle.html` | The same method on other puzzles |
| `LayerSudoku-MapColor.html`, `LayerSudoku-StarCost.html` | Optimisation: map colouring and Star Cost |
| `LayerSudoku-Rubik.html`, `Rubik Sudoku.html`, `LayerSudoku-SwapTest.html` | Rubik-style swap experiments |

## Report

`report/OptionLayers_Report.pdf` — *Option Layers and Cuts*, with experiments against classic algorithms. `report/report.html` is its source; `report/tools` holds the headless test harness (Node + Edge), the chart scripts and `page_build/` (generators for the Few Givens, MRV 3D and Tensor pages).

## Earlier work

`sudoku_solver/` and `Sudoku/` hold earlier Python versions of the solver.
