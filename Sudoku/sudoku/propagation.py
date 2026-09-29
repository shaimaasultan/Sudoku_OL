# propagation.py
from utils import get_row_values, get_col_values, get_block_values


def propagate_layers(grid, domains):
    """
    Layer-based propagation:
    - For each empty cell, intersect its domain with row/col/block constraints.
    - If a domain shrinks to size 1, assign that value.
    - Repeat until no changes.
    Returns (changed, new_grid, new_domains).
    """
    n = len(grid)
    changed_any = False
    new_grid = [row[:] for row in grid]
    new_domains = {k: v.copy() for k, v in domains.items()}

    while True:
        changed = False

        for r in range(n):
            for c in range(n):
                if new_grid[r][c] != 0:
                    continue

                row_vals = get_row_values(new_grid, r)
                col_vals = get_col_values(new_grid, c)
                block_vals = get_block_values(new_grid, r, c)

                used = row_vals | col_vals | block_vals
                dom_key = (r, c)
                old_dom = new_domains[dom_key]
                new_dom = old_dom - used

                if not new_dom:
                    # Domain wipeout: contradiction
                    return False, grid, domains

                if new_dom != old_dom:
                    new_domains[dom_key] = new_dom
                    changed = True

                if len(new_dom) == 1 and new_grid[r][c] == 0:
                    val = next(iter(new_dom))
                    new_grid[r][c] = val
                    changed = True

        if not changed:
            break

        changed_any = True

    return changed_any, new_grid, new_domains
