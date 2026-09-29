import tkinter as tk
import copy
from collections import Counter

# ---------------------------------------------------------
# Core logic
# ---------------------------------------------------------

def count_digits(grid):
    flat = [x for row in grid for x in row if x != 0]
    return Counter(flat)

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

def is_solved(grid):
    return all(grid[r][c] != 0 for r in range(9) for c in range(9))

# ---------------------------------------------------------
# GUI (Canvas-based)
# ---------------------------------------------------------

class SudokuGUI:
    def __init__(self, root, grid):
        self.root = root
        self.grid = copy.deepcopy(grid)

        self.round_digits = []
        self.current_digit_index = 0
        self.any_change_in_round = False

        self.playing = False
        self.layer_export_index = 0

        self.canvas = tk.Canvas(root, width=450, height=450, bg="white")
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
        cell_size = 50

        for r in range(9):
            for c in range(9):
                x1 = c * cell_size
                y1 = r * cell_size
                x2 = x1 + cell_size
                y2 = y1 + cell_size

                box_index = (r // 3) * 3 + (c // 3)
                box_color = "#ffffff" if box_index % 2 == 0 else "#eef2ff"

                self.canvas.create_rectangle(x1, y1, x2, y2,
                                             fill=box_color, outline="black")

                if self.grid[r][c] != 0:
                    self.canvas.create_text(x1+25, y1+25, text=str(self.grid[r][c]),
                                            font=("Arial", 18), fill="black")
                else:
                    if layer is not None:
                        if layer[r][c]:
                            self.canvas.create_text(x1+25, y1+25, text=".",
                                                    font=("Arial", 18), fill="green")
                        else:
                            self.canvas.create_text(x1+25, y1+25, text="X",
                                                    font=("Arial", 18), fill="red")

        if digit is not None:
            self.root.title(f"Layer for digit {digit}")
        else:
            self.root.title("Sudoku Layer Viewer")

    def export_layer_image(self, digit):
        filename = f"layer_{self.layer_export_index:03d}_digit_{digit}.ps"
        self.layer_export_index += 1
        self.canvas.postscript(file=filename, colormode='color')

    def next_step(self):
        # Stop if solved
        if is_solved(self.grid):
            self.playing = False
            self.root.title("Solved!")
            return

        # Start a new round
        if not self.round_digits:
            counts = count_digits(self.grid)
            if not counts:
                self.playing = False
                self.root.title("No digits — finished")
                return
            self.round_digits = [d for (d, _) in counts.most_common()]
            self.current_digit_index = 0
            self.any_change_in_round = False

        # Finished all digits in this round → apply row/column rule
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

        # Process current digit
        digit = self.round_digits[self.current_digit_index]

        layer = build_layer(self.grid, digit)
        self.update_display(layer, digit)
        self.export_layer_image(digit)

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
# Run
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

initial_grid = [
    [0,0,0, 0,0,1, 2,3,0],
    [1,2,3, 0,0,8, 0,4,0],
    [8,0,4, 0,0,7, 6,5,0],

    [7,6,5, 0,0,0, 0,0,0],
    [0,0,0, 0,0,0, 0,0,0],
    [0,0,0, 0,0,0, 1,2,3],

    [0,1,2, 3,0,0, 8,0,4],
    [0,8,0, 4,0,0, 7,6,5],
    [0,7,6, 5,0,0, 0,0,0],
]

root = tk.Tk()
app = SudokuGUI(root, initial_grid)
root.mainloop()
