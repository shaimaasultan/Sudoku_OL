# solver.py

from propagation import propagate_hybrid
from heuristics import select_mrv_cell
from backtracking import shallow_backtrack
from utils import (
    load_grid_from_file,
    print_grid,
    is_solved,
    get_empty_cells,
    build_domains,
)


def solve_grid(grid, max_depth=3):
    """
    Hybrid solver:
    1. Build initial domains.
    2. Run hybrid layer + forward-checking propagation.
    3. If not solved, run shallow backtracking guided by MRV.
    """
    domains = build_domains(grid)

    # Run hybrid propagation once (it already loops to fixed point)
    ok, grid, domains = propagate_hybrid(grid, domains)
    if not ok:
        return None

    if is_solved(grid):
        return grid

    # If still not solved, run shallow backtracking
    if not get_empty_cells(grid):
        return grid

    solution = shallow_backtrack(grid, domains, depth=0, max_depth=max_depth)
    return solution


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Hybrid Sudoku-like CSP solver")
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="Path to puzzle file (0 or . for empty cells).",
    )
    parser.add_argument(
        "--max-depth",
        type=int,
        default=3,
        help="Maximum backtracking depth for shallow search.",
    )
    args = parser.parse_args()

    grid = load_grid_from_file(args.input)
    print("Input grid:")
    print_grid(grid)

    solution = solve_grid(grid, max_depth=args.max_depth)

    if solution and is_solved(solution):
        print("\nSolved grid:")
        print_grid(solution)
    else:
        print("\nNo solution found (within shallow search limits).")


if __name__ == "__main__":
    main()
