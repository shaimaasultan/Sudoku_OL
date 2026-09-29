# propagation.py
from collections import deque
from utils import get_row_values, get_col_values, get_block_values


def propagate_hybrid(grid, domains):
    """
    Hybrid layer + forward-checking propagation.

    - Start from current assignments.
    - Maintain a queue of cells whose assignment or domain changed.
    - For each such cell, forward-check neighbors (same row/col/block).
    - If any neighbor's domain shrinks to size 1, assign it and enqueue.
    - Stop at fixed point or on contradiction.

    Returns (ok, new_grid, new_domains).
      ok = False means contradiction (domain wipeout).
    """
    n = len(grid)
    new_grid = [row[:] for row in grid]
    new_domains = {k: v.copy() for k, v in domains.items()}

    # Initialize queue with all assigned cells
    q = deque()
    for r in range(n):
        for c in range(n):
            if new_grid[r][c] != 0:
                q.append((r, c))

    def neighbors(r, c):
        """All cells sharing row, column, or block with (r, c)."""
        b = int(n ** 0.5)
        br = (r // b) * b
        bc = (c // b) * b
        seen = set()

        # Row
        for cc in range(n):
            if cc != c:
                seen.add((r, cc))
        # Column
        for rr in range(n):
            if rr != r:
                seen.add((rr, c))
        # Block
        if b * b == n:
            for rr in range(br, br + b):
                for cc in range(bc, bc + b):
                    if rr == r and cc == c:
                        continue
                    seen.add((rr, cc))
        return seen

    # If no initial assignments, seed queue with all empty cells once
    if not q:
        for r in range(n):
            for c in range(n):
                if new_grid[r][c] == 0:
                    q.append((r, c))

    while q:
        r, c = q.popleft()

        # Recompute constraints for this cell's neighbors
        for nr, nc in neighbors(r, c):
            if new_grid[nr][nc] != 0:
                continue

            row_vals = get_row_values(new_grid, nr)
            col_vals = get_col_values(new_grid, nc)
            block_vals = get_block_values(new_grid, nr, nc)
            used = row_vals | col_vals | block_vals

            key = (nr, nc)
            old_dom = new_domains.get(key, set())
            if not old_dom:
                # If domain not initialized, start from full set
                old_dom = set(range(1, n + 1))

            new_dom = old_dom - used
            if not new_dom:
                # Domain wipeout: contradiction
                return False, grid, domains

            if new_dom != old_dom:
                new_domains[key] = new_dom

                # If singleton, assign and enqueue for further propagation
                if len(new_dom) == 1:
                    val = next(iter(new_dom))
                    if new_grid[nr][nc] == 0:
                        new_grid[nr][nc] = val
                        q.append((nr, nc))

    return True, new_grid, new_domains
