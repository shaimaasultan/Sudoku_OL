import tkinter as tk
import copy
from collections import Counter
import math
import random
import time

# ---------------------------------------------------------
# Symbol mapping for N up to 62 (1-9, A-Z, a-z)
# ---------------------------------------------------------

SYMBOLS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

def num_to_symbol(x):
    if x <= 0:
        return "."
    if x < len(SYMBOLS):
        return SYMBOLS[x]
    return str(x)

# ---------------------------------------------------------
# Size + box shape
# ---------------------------------------------------------

def get_size(grid):
    return len(grid)

def choose_box_shape(N):
    best = None
    root = math.sqrt(N)
    for r in range(1, N+1):
        if N % r == 0:
            c = N // r
            if r <= c:
                diff = abs(r - root)
                if best is None or diff < best[0]:
                    best = (diff, r, c)
    if best is None:
        raise ValueError(f"No valid box shape for N={N}")
    _, r, c = best
    return r, c

def count_digits(grid):
    flat = [x for row in grid for x in row if x != 0]
    return Counter(flat)

def is_solved(grid):
    N = get_size(grid)
    return all(grid[r][c] != 0 for r in range(N) for c in range(N))

# ---------------------------------------------------------
# Layer construction
# ---------------------------------------------------------

def build_layer(grid, digit):
    N = get_size(grid)
    box_rows, box_cols = choose_box_shape(N)

    layer = [[True if grid[r][c] == 0 else False for c in range(N)] for r in range(N)]

    # Block boxes
    for br in range(0, N, box_rows):
        for bc in range(0, N, box_cols):
            box_has_digit = any(
                grid[r][c] == digit
                for r in range(br, br + box_rows)
                for c in range(bc, bc + box_cols)
            )
            if box_has_digit:
                for r in range(br, br + box_rows):
                    for c in range(bc, bc + box_cols):
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
# Fill logic
# ---------------------------------------------------------

def fill_for_digit(grid, digit, layer):
    N = get_size(grid)
    box_rows, box_cols = choose_box_shape(N)
    new_grid = copy.deepcopy(grid)
    changed = False

    for br in range(0, N, box_rows):
        for bc in range(0, N, box_cols):
            candidates = [
                (r, c)
                for r in range(br, br + box_rows)
                for c in range(bc, bc + box_cols)
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
            missing = set(range(1, N + 1)) - set(row)
            c = row.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    # Columns
    for c in range(N):
        col = [new_grid[r][c] for r in range(N)]
        if col.count(0) == 1:
            missing = set(range(1, N + 1)) - set(col)
            r = col.index(0)
            new_grid[r][c] = missing.pop()
            changed = True

    return new_grid, changed

# ---------------------------------------------------------
# Deterministic propagation using layer logic
# ---------------------------------------------------------

def propagate_with_layers(grid):
    grid = copy.deepcopy(grid)
    while True:
        changed_any = False

        counts = count_digits(grid)
        if counts:
            digits_order = [d for (d, _) in counts.most_common()]
            for digit in digits_order:
                layer = build_layer(grid, digit)
                new_grid, changed = fill_for_digit(grid, digit, layer)
                if changed:
                    grid = new_grid
                    changed_any = True

        grid, changed_rc = fill_single_missing(grid)
        if changed_rc:
            changed_any = True

        if not changed_any:
            break

    return grid

# ---------------------------------------------------------
# Simple Latin-based full grid generator + puzzle generator
# ---------------------------------------------------------

def generate_full_sudoku(N):
    box_rows, box_cols = choose_box_shape(N)
    grid = [[0]*N for _ in range(N)]
    for r in range(N):
        for c in range(N):
            grid[r][c] = (r * box_cols + r // box_rows + c) % N + 1
    return grid

def shuffle_sudoku(grid):
    N = len(grid)
    box_rows, box_cols = choose_box_shape(N)

    # Digit permutation
    perm = list(range(1, N+1))
    random.shuffle(perm)
    for r in range(N):
        for c in range(N):
            grid[r][c] = perm[grid[r][c]-1]

    # Shuffle row bands
    for band in range(0, N, box_rows):
        rows = list(range(band, band + box_rows))
        random.shuffle(rows)
        grid[band:band+box_rows] = [grid[r] for r in rows]

    # Shuffle column bands
    for band in range(0, N, box_cols):
        cols = list(range(band, band + box_cols))
        random.shuffle(cols)
        for r in range(N):
            grid[r][band:band+box_cols] = [grid[r][c] for c in cols]

    return grid

def generate_initial_grid(N, clues_ratio=0.45):
    full = generate_full_sudoku(N)
    full = shuffle_sudoku(full)

    total = N*N
    clues = int(total * clues_ratio)
    remove = total - clues

    positions = [(r,c) for r in range(N) for c in range(N)]
    random.shuffle(positions)

    for i in range(remove):
        r, c = positions[i]
        full[r][c] = 0

    return full

# ---------------------------------------------------------
# GUI (Layer-only solver with size, difficulty, speed, timer)
# ---------------------------------------------------------

class SudokuGUI:
    def __init__(self, root, grid):
        self.root = root
        self.grid = copy.deepcopy(grid)
        self.N = get_size(grid)
        self.box_rows, self.box_cols = choose_box_shape(self.N)

        # Mark original givens
        self.original = [[(grid[r][c] != 0) for c in range(self.N)] for r in range(self.N)]

        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False

        self.playing = False

        # Timer state
        self.start_time = None
        self.timer_running = False

        self.timer_label = tk.Label(root, text="Time: 00:00:00", font=("Arial", 12))
        self.timer_label.pack(pady=5)

        size = 40 * self.N
        self.canvas = tk.Canvas(root, width=size, height=size, bg="white")
        self.canvas.pack()

        controls = tk.Frame(root)
        controls.pack(pady=5)

        self.next_button = tk.Button(controls, text="Next Step", command=self.next_step)
        self.next_button.grid(row=0, column=0, padx=5)

        self.play_button = tk.Button(controls, text="Play", command=self.toggle_play)
        self.play_button.grid(row=0, column=1, padx=5)

        tk.Label(controls, text="Speed (ms):").grid(row=0, column=2, padx=5)
        self.speed_scale = tk.Scale(controls, from_=50, to=2000, orient=tk.HORIZONTAL)
        self.speed_scale.set(300)
        self.speed_scale.grid(row=0, column=3, padx=5)

        controls2 = tk.Frame(root)
        controls2.pack(pady=5)

        tk.Label(controls2, text="Size:").grid(row=0, column=0, padx=5)
        self.size_var = tk.StringVar()
        self.size_var.set(str(self.N))
        sizes = ["4", "6", "8", "9", "12", "16", "36"]
        self.size_menu = tk.OptionMenu(controls2, self.size_var, *sizes)
        self.size_menu.grid(row=0, column=1, padx=5)

        tk.Label(controls2, text="Difficulty (clues %):").grid(row=0, column=2, padx=5)
        self.diff_scale = tk.Scale(controls2, from_=20, to=80, orient=tk.HORIZONTAL)
        self.diff_scale.set(45)
        self.diff_scale.grid(row=0, column=3, padx=5)

        self.new_button = tk.Button(controls2, text="New Puzzle", command=self.new_puzzle)
        self.new_button.grid(row=0, column=4, padx=5)

        self.update_display()
        self.root.after(100, self.animation_loop)

    # ---------------- Timer helpers ----------------

    def format_time(self, seconds):
        h = int(seconds // 3600)
        m = int((seconds % 3600) // 60)
        s = int(seconds % 60)
        return f"{h:02d}:{m:02d}:{s:02d}"

    def update_timer(self):
        if self.timer_running and self.start_time is not None:
            elapsed = time.time() - self.start_time
            self.timer_label.config(text=f"Time: {self.format_time(elapsed)}")
            self.root.after(1000, self.update_timer)

    # ---------------- Display ----------------

    def update_display(self, layer=None, digit=None):
        self.canvas.delete("all")
        cell_size = int(self.canvas.winfo_width() / self.N)

        for r in range(self.N):
            for c in range(self.N):
                x1 = c * cell_size
                y1 = r * cell_size
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                box_index = (r // self.box_rows) * (self.N // self.box_cols) + (c // self.box_cols)
                box_color = "#ffffff" if box_index % 2 == 0 else "#eef2ff"

                self.canvas.create_rectangle(x1, y1, x2, y2,
                                             fill=box_color, outline="black")

                if self.grid[r][c] != 0:
                    self.canvas.create_text(
                        x1 + cell_size / 2,
                        y1 + cell_size / 2,
                        text=str(self.grid[r][c]),
                        font=("Arial", max(10, cell_size // 2)),
                        fill="black"
                    )
                else:
                    if layer is not None:
                        if layer[r][c]:
                            self.canvas.create_text(
                                x1 + cell_size / 2,
                                y1 + cell_size / 2,
                                text=".",
                                font=("Arial", max(10, cell_size // 2)),
                                fill="green"
                            )
                        else:
                            self.canvas.create_text(
                                x1 + cell_size / 2,
                                y1 + cell_size / 2,
                                text="X",
                                font=("Arial", max(10, cell_size // 2)),
                                fill="red"
                            )

        if digit is not None:
            self.root.title(f"{self.N}x{self.N} Layer for digit {digit}")
        else:
            self.root.title(f"{self.N}x{self.N} Sudoku Layer Viewer")

    def next_step(self):
        if is_solved(self.grid):
            self.playing = False
            self.root.title("Solved!")
            self.timer_running = False
            return

        if not self.round_digits:
            counts = count_digits(self.grid)
            if not counts:
                self.playing = False
                self.root.title("No digits — finished")
                self.timer_running = False
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
                    self.timer_running = False
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
        if not self.playing: # starting a new run → reset timer
            self.start_time = time.time() 
            self.timer_running = True 
            self.update_timer()
        self.playing = not self.playing
        self.play_button.config(text="Pause" if self.playing else "Play")
        if not self.playing:
            self.timer_running = False

    def animation_loop(self):
        if self.playing:
            self.next_step()
        delay = self.speed_scale.get()
        self.root.after(delay, self.animation_loop)
    # ---------------- New puzzle ----------------

    def new_puzzle(self):
        size = int(self.size_var.get())
        clues_percent = self.diff_scale.get() / 100.0

        self.N = size
        grid = generate_initial_grid(self.N, clues_ratio=clues_percent)
        self.grid = grid
        self.box_rows, self.box_cols = choose_box_shape(self.N)
        self.original = [[(grid[r][c] != 0) for c in range(self.N)] for r in range(self.N)]

        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False
        self.playing = False
        self.timer_running = False
        self.timer_label.config(text="Time: 00:00:00")

        size_px = 40 * self.N
        self.canvas.config(width=size_px, height=size_px)

        self.update_display()

# ---------------------------------------------------------
# Main
# ---------------------------------------------------------

if __name__ == "__main__":
    # Default start: 9x9 with ~45% clues
    N0 = 9
    initial_grid = generate_initial_grid(N0, clues_ratio=0.45)

    root = tk.Tk()
    app = SudokuGUI(root, initial_grid)
    root.mainloop()
