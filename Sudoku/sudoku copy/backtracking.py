# backtracking.py

from copy import deepcopy
from heuristics import select_mrv_cell
from propagation import propagate_hybrid
from utils import is_solved


def shallow_backtrack(grid, domains, depth, max_depth):
    """
    Depth-limited backtracking with MRV + hybrid propagation.
    - MRV selects the next cell.
    - Try each value in its domain.
    - After each assignment, run hybrid propagation.
    - Recurse until solved or depth limit reached.
    """
    if is_solved(grid):
        return grid

    if depth > max_depth:
        return None

    cell = select_mrv_cell(grid, domains)
    if cell is None:
        return grid

    r, c = cell
    dom = domains.get((r, c), set())
    if not dom:
        return None

    for val in sorted(dom):
        new_grid = deepcopy(grid)
        new_domains = {k: v.copy() for k, v in domains.items()}

        # Assign value
        new_grid[r][c] = val
        new_domains[(r, c)] = {val}

        # Hybrid propagation
        ok, new_grid2, new_domains2 = propagate_hybrid(new_grid, new_domains)
        if not ok:
            continue

        # Recurse
        result = shallow_backtrack(new_grid2, new_domains2, depth + 1, max_depth)
        if result is not None and is_solved(result):
            return result

    return None
