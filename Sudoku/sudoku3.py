import tkinter as tk
import copy
from collections import Counter

# ---------------------------------------------------------
# Utility functions
# ---------------------------------------------------------

def count_digits(grid):
    flat = [x for row in grid for x in row if x != 0]
    return Counter(flat)

# ---------------------------------------------------------
# Build layer (your exact logic)
# ---------------------------------------------------------

def build_layer(grid, digit):
    layer = [[True if grid[r][c] == 0 else False for c in range(9)] for r in range(9)]

    # Block boxes
    for br in range(0, 9, 3):
        for bc in range(0, 9, 3):
            box_has_digit = any(
                grid[r][c] == digit
                for r in range(br, br+3)
                for c in range(bc, bc+3)
            )
            if box_has_digit:
                for r in range(br, br+3):
                    for c in range(bc, bc+3):
                        if grid[r][c] == 0:
                            layer[r][c] = False

    # Block rows/columns
    for r in range(9):
        for c in range(9):
            if grid[r][c] == digit:
                for cc in range(9):
                    if grid[r][cc] == 0:
                        layer[r][cc] = False
                for rr in range(9):
                    if grid[rr][c] == 0:
                        layer[rr][c] = False

    return layer

# ---------------------------------------------------------
# Fill boxes with exactly one allowed cell
# ---------------------------------------------------------

def fill_for_digit(grid, digit, layer):
    new_grid = copy.deepcopy(grid)
    changed = False

    for b in range(9):
        br = (b // 3) * 3
        bc = (b % 3) * 3

        candidates = [(r, c) for r in range(br, br+3)
                              for c in range(bc, bc+3)
                              if layer[r][c]]

        if len(candidates) == 1:
            r, c = candidates[0]
            if new_grid[r][c] == 0:
                new_grid[r][c] = digit
                changed = True

    return new_grid, changed

# ---------------------------------------------------------
# Fill rows/columns with exactly one missing number
# ---------------------------------------------------------

def fill_single_missing(grid):
    new_grid = copy.deepcopy(grid)
    changed = False

    # Rows
    for r in range(9):
        row = new_grid[r]
        if row.count(0) == 1:
            missing = set(range(1,10)) - set(row)
            c = row.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    # Columns
    for c in range(9):
        col = [new_grid[r][c] for r in range(9)]
        if col.count(0) == 1:
            missing = set(range(1,10)) - set(col)
            r = col.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    return new_grid, changed

# ---------------------------------------------------------
# GUI Class
# ---------------------------------------------------------

class SudokuGUI:
    def __init__(self, root, grid):
        self.root = root
        self.grid = copy.deepcopy(grid)
        self.step_index = 0
        self.round_digits = []
        self.current_digit_index = 0

        self.cells = [[None for _ in range(9)] for _ in range(9)]

        self.frame = tk.Frame(root)
        self.frame.pack()

        # Build grid UI
        for r in range(9):
            for c in range(9):
                lbl = tk.Label(self.frame, text="", width=4, height=2,
                               font=("Arial", 16), relief="ridge", borderwidth=1)
                lbl.grid(row=r, column=c)
                self.cells[r][c] = lbl # type: ignore

        self.button = tk.Button(root, text="Next Step", command=self.next_step)
        self.button.pack()

        self.update_display()

    # -----------------------------------------------------
    # Update GUI display
    # -----------------------------------------------------
    def update_display(self, layer=None, digit=None):
        for r in range(9):
            for c in range(9):
                cell = self.cells[r][c]

                if self.grid[r][c] != 0:
                    cell.config(text=str(self.grid[r][c]), fg="black", bg="white") # type: ignore
                else:
                    if layer is None:
                        cell.config(text="", bg="white") # type: ignore
                    else:
                        if layer[r][c]:
                            cell.config(text=".", fg="green", bg="white") # type: ignore
                        else:
                            cell.config(text="X", fg="red", bg="white") # type: ignore

        if digit is not None:
            self.root.title(f"Layer for digit {digit}")
        else:
            self.root.title("Sudoku Layer Viewer")

    # -----------------------------------------------------
    # Perform next step in solving
    # -----------------------------------------------------
    def next_step(self):
        # If no digit list for this round, compute it
        if not self.round_digits:
            counts = count_digits(self.grid)
            if not counts:
                return
            self.round_digits = [d for (d, _) in counts.most_common()]
            self.current_digit_index = 0

        # If finished all digits in this round, apply row/column rule
        if self.current_digit_index >= len(self.round_digits):
            self.grid, changed = fill_single_missing(self.grid)
            self.update_display()
            self.round_digits = []
            return

        digit = self.round_digits[self.current_digit_index]

        # Build layer
        layer = build_layer(self.grid, digit)
        self.update_display(layer, digit)

        # Try filling
        new_grid, changed = fill_for_digit(self.grid, digit, layer)

        if changed:
            self.grid = new_grid
            self.update_display()
        else:
            self.current_digit_index += 1

# ---------------------------------------------------------
# Run GUI
# ---------------------------------------------------------

initial_grid = [
    [5,3,0, 0,7,0, 0,0,0],
    [6,0,0, 1,9,5, 0,0,0],
    [0,9,8, 0,0,0, 0,6,0],

    [8,0,0, 0,6,0, 0,0,3],
    [4,0,0, 8,0,3, 0,0,1],
    [7,0,0, 0,2,0, 0,0,6],

    [0,6,0, 0,0,0, 2,8,0],
    [0,0,0, 4,1,9, 0,0,5],
    [0,0,0, 0,8,0, 0,7,9],
]

root = tk.Tk()
app = SudokuGUI(root, initial_grid)
root.mainloop()
