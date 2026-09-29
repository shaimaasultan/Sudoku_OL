# backtracking.py

from heuristics import select_mrv_cell
from propagation import propagate_layers
from utils import is_solved


def shallow_backtrack(grid, domains, depth, max_depth):
    """
    Explicit-undo backtracking:
    - Assign value directly into grid.
    - Propagate.
    - Recurse.
    - Undo assignment and domain changes on failure.
    """
    if is_solved(grid):
        return grid

    if depth > max_depth:
        return None

    cell = select_mrv_cell(grid, domains)
    if cell is None:
        return grid

    r, c = cell
    dom = domains[(r, c)]
    if not dom:
        return None

    # Save original domain for undo
    original_domain = dom.copy()

    for val in sorted(dom):
        # --- ASSIGN ---
        grid[r][c] = val
        domains[(r, c)] = {val}

        # --- PROPAGATE ---
        changed, new_grid, new_domains = propagate_layers(grid, domains)

        # If propagation produced contradiction, undo and continue
        if any(len(d) == 0 for d in new_domains.values()):
            # --- UNDO ---
            grid[r][c] = 0
            domains[(r, c)] = original_domain.copy()
            continue

        # --- RECURSE ---
        result = shallow_backtrack(new_grid, new_domains, depth + 1, max_depth)
        if result is not None and is_solved(result):
            return result

        # --- UNDO ---
        grid[r][c] = 0
        domains[(r, c)] = original_domain.copy()

    return None
