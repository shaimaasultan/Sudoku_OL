import tkinter as tk
import copy
from collections import Counter
import math

# ---------------------------------------------------------
# Core helpers (size-agnostic)
# ---------------------------------------------------------

def get_size(grid):
    return len(grid)

def get_box_size(N):
    r = int(math.isqrt(N))
    if r * r != N:
        raise ValueError("Grid size N must be a perfect square (4, 9, 16, ...)")
    return r

def count_digits(grid):
    flat = [x for row in grid for x in row if x != 0]
    return Counter(flat)

def is_solved(grid):
    N = get_size(grid)
    return all(grid[r][c] != 0 for r in range(N) for c in range(N))

# ---------------------------------------------------------
# Layer construction (generalized)
# ---------------------------------------------------------

def build_layer(grid, digit):
    N = get_size(grid)
    B = get_box_size(N)

    layer = [[True if grid[r][c] == 0 else False for c in range(N)] for r in range(N)]

    # Block boxes
    for br in range(0, N, B):
        for bc in range(0, N, B):
            box_has_digit = any(
                grid[r][c] == digit
                for r in range(br, br+B)
                for c in range(bc, bc+B)
            )
            if box_has_digit:
                for r in range(br, br+B):
                    for c in range(bc, bc+B):
                        if grid[r][c] == 0:
                            layer[r][c] = False

    # Block rows/columns
    for r in range(N):
        for c in range(N):
            if grid[r][c] == digit:
                for cc in range(N):
                    if grid[r][cc] == 0:
                        layer[r][cc] = False
                for rr in range(N):
                    if grid[rr][c] == 0:
                        layer[rr][c] = False

    return layer

# ---------------------------------------------------------
# Fill logic (generalized)
# ---------------------------------------------------------

def fill_for_digit(grid, digit, layer):
    N = get_size(grid)
    B = get_box_size(N)
    new_grid = copy.deepcopy(grid)
    changed = False

    for b_r in range(0, N, B):
        for b_c in range(0, N, B):
            candidates = [
                (r, c)
                for r in range(b_r, b_r+B)
                for c in range(b_c, b_c+B)
                if layer[r][c]
            ]
            if len(candidates) == 1:
                r, c = candidates[0]
                if new_grid[r][c] == 0:
                    new_grid[r][c] = digit
                    changed = True

    return new_grid, changed

def fill_single_missing(grid):
    N = get_size(grid)
    new_grid = copy.deepcopy(grid)
    changed = False

    # Rows
    for r in range(N):
        row = new_grid[r]
        if row.count(0) == 1:
            missing = set(range(1, N+1)) - set(row)
            c = row.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    # Columns
    for c in range(N):
        col = [new_grid[r][c] for r in range(N)]
        if col.count(0) == 1:
            missing = set(range(1, N+1)) - set(col)
            r = col.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    return new_grid, changed

# ---------------------------------------------------------
# GUI (Canvas-based, scaled by N)
# ---------------------------------------------------------

class SudokuGUI:
    def __init__(self, root, grid):
        self.root = root
        self.grid = copy.deepcopy(grid)
        self.N = get_size(grid)
        self.B = get_box_size(self.N)

        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False

        self.playing = False

        size = 50 * self.N
        self.canvas = tk.Canvas(root, width=size, height=size, bg="white")
        self.canvas.pack()

        controls = tk.Frame(root)
        controls.pack(pady=5)

        self.next_button = tk.Button(controls, text="Next Step", command=self.next_step)
        self.next_button.grid(row=0, column=0, padx=5)

        self.play_button = tk.Button(controls, text="Play", command=self.toggle_play)
        self.play_button.grid(row=0, column=1, padx=5)

        tk.Label(controls, text="Speed (ms):").grid(row=0, column=2, padx=5)
        self.speed_scale = tk.Scale(controls, from_=100, to=2000,
                                    orient=tk.HORIZONTAL)
        self.speed_scale.set(500)
        self.speed_scale.grid(row=0, column=3, padx=5)

        self.update_display()
        self.root.after(100, self.animation_loop)

    def update_display(self, layer=None, digit=None):
        self.canvas.delete("all")
        cell_size = int(self.canvas.winfo_width() / self.N)

        for r in range(self.N):
            for c in range(self.N):
                x1 = c * cell_size
                y1 = r * cell_size
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                box_index = (r // self.B) * self.B + (c // self.B)
                box_color = "#ffffff" if box_index % 2 == 0 else "#eef2ff"

                self.canvas.create_rectangle(x1, y1, x2, y2,
                                             fill=box_color, outline="black")

                if self.grid[r][c] != 0:
                    self.canvas.create_text(x1+cell_size/2, y1+cell_size/2,
                                            text=str(self.grid[r][c]),
                                            font=("Arial", max(10, cell_size//2)),
                                            fill="black")
                else:
                    if layer is not None:
                        if layer[r][c]:
                            self.canvas.create_text(x1+cell_size/2, y1+cell_size/2,
                                                    text=".",
                                                    font=("Arial", max(10, cell_size//2)),
                                                    fill="green")
                        else:
                            self.canvas.create_text(x1+cell_size/2, y1+cell_size/2,
                                                    text="X",
                                                    font=("Arial", max(10, cell_size//2)),
                                                    fill="red")

        if digit is not None:
            self.root.title(f"{self.N}x{self.N} Layer for digit {digit}")
        else:
            self.root.title(f"{self.N}x{self.N} Sudoku Layer Viewer")

    def next_step(self):
        if is_solved(self.grid):
            self.playing = False
            self.root.title("Solved!")
            return

        if not self.round_digits:
            counts = count_digits(self.grid)
            if not counts:
                self.playing = False
                self.root.title("No digits — finished")
                return
            self.round_digits = [d for (d, _) in counts.most_common()]
            self.current_digit_index = 0
            self.any_change_in_round = False

        if self.current_digit_index >= len(self.round_digits):
            self.grid, changed_rc = fill_single_missing(self.grid)
            if changed_rc:
                self.any_change_in_round = True
                self.update_display()
            else:
                if not self.any_change_in_round:
                    self.playing = False
                    self.root.title("No more changes — finished")
                    return
            self.round_digits = []
            return

        digit = self.round_digits[self.current_digit_index]

        layer = build_layer(self.grid, digit)
        self.update_display(layer, digit)

        new_grid, changed = fill_for_digit(self.grid, digit, layer)

        if changed:
            self.grid = new_grid
            self.any_change_in_round = True
            self.update_display()
        else:
            self.current_digit_index += 1

    def toggle_play(self):
        self.playing = not self.playing
        self.play_button.config(text="Pause" if self.playing else "Play")

    def animation_loop(self):
        if self.playing:
            self.next_step()
        delay = self.speed_scale.get()
        self.root.after(delay, self.animation_loop)

# ---------------------------------------------------------
# Example: standard 9x9
# ---------------------------------------------------------

initial_grid_9x9 = [
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


initial_grid_9x9 = [
    [0,0,0, 0,0,1, 2,3,0],
    [1,2,3, 0,0,8, 0,4,0],
    [0,0,0, 0,0,0, 0,0,0],

    [0,0,0, 2,0,0, 0,0,0],
    [0,0,0, 0,3,0, 0,0,0],
    [0,0,0, 0,0,5, 0,0,0],

    [0,0,0, 0,0,0, 0,6,0],
    [0,7,0, 9,0,0, 4,5,1],
    [0,8,9, 6,0,0, 0,0,0]
]

# initial_grid_4x4 = [
#     [0,3,0, 1],
#     [1,0,3, 0],
#     [2,0,1, 0],
#     [0,1,0, 2]
# ]

# initial_grid_8x8 = [
#     [1,0,0, 4,2,0, 0,0],
#     [0,6,0, 0,0,7, 0,5],
#     [0,0,5, 0,0,8, 0,0],
#     [6,8,0, 0,1,0, 0,0],
#     [0,0,0, 6,0,0, 5,2],
#     [0,0,4, 0,0,6, 0,0],
#     [8,0,6, 0,0,0, 7,0],
#     [0,0,0, 7,3,0, 0,6]
# ]

root = tk.Tk()
app = SudokuGUI(root, initial_grid_9x9)
root.mainloop()
