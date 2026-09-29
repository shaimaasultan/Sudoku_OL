# heuristics.py
from utils import get_empty_cells


def select_mrv_cell(grid, domains):
    """
    MRV (Minimum Remaining Values) heuristic:
    Select the empty cell with the smallest domain size.
    """
    empty_cells = get_empty_cells(grid)
    if not empty_cells:
        return None

    best_cell = None
    best_size = None

    for (r, c) in empty_cells:
        dom = domains.get((r, c), set())
        size = len(dom)
        if size == 0:
            # Immediate dead end
            return (r, c)
        if best_size is None or size < best_size:
            best_size = size
            best_cell = (r, c)

    return best_cell
