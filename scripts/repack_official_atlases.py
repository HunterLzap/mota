"""Normalize generated atlases so wide objects cannot leak into adjacent cells."""

from array import array
from collections import deque
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OFFICIAL = ROOT / "images/items/artwork/official"
RAW = ROOT / "output/official-item-reference-2026-11-01/generated"
SETS = ["starter", "courage", "destiny_goddess", "sagael_set", "judge", "guardian_knight", "wargod_set"]
CELL = 512


def components(alpha, width, height):
    labels = array("I", [0]) * (width * height)
    items = []
    label = 0
    for start in range(width * height):
        if labels[start] or alpha[start] < 9:
            continue
        label += 1
        labels[start] = label
        queue = deque([start])
        count = 0
        left, top, right, bottom = width, height, 0, 0
        while queue:
            point = queue.popleft()
            y, x = divmod(point, width)
            count += 1
            left, right = min(left, x), max(right, x)
            top, bottom = min(top, y), max(bottom, y)
            for ny in range(max(0, y - 1), min(height, y + 2)):
                row = ny * width
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    target = row + nx
                    if not labels[target] and alpha[target] >= 9:
                        labels[target] = label
                        queue.append(target)
        if count >= 40:
            items.append({
                "label": label, "count": count,
                "box": (left, top, right + 1, bottom + 1),
                "center": ((left + right) / 2, (top + bottom) / 2),
            })
    return labels, items


def repack(path, columns=4, rows=3, count=12, cell_size=CELL):
    source_path = RAW / path.name
    with Image.open(source_path if source_path.exists() else path) as source:
        image = source.convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A").tobytes()
    labels, items = components(alpha, width, height)
    cells = [[] for _ in range(count)]
    for item in items:
        center_x, center_y = item["center"]
        column = min(columns - 1, max(0, int(center_x / (width / columns))))
        row = min(rows - 1, max(0, int(center_y / (height / rows))))
        item["cell"] = row * columns + column
        if item["cell"] < count:
            cells[item["cell"]].append(item["label"])
    output_image = Image.new("RGBA", (cell_size * columns, cell_size * rows), (0, 0, 0, 0))
    pixels = image.load()
    for index, labels_in_cell in enumerate(cells):
        if not labels_in_cell:
            continue
        wanted = set(labels_in_cell)
        masked = Image.new("RGBA", image.size, (0, 0, 0, 0))
        masked_pixels = masked.load()
        for y in range(height):
            row = y * width
            for x in range(width):
                if labels[row + x] in wanted:
                    masked_pixels[x, y] = pixels[x, y]
        bbox = masked.getbbox()
        if not bbox:
            continue
        subject = masked.crop(bbox)
        margin = round(cell_size * 0.08)
        scale = min((cell_size - margin * 2) / subject.width, (cell_size - margin * 2) / subject.height)
        subject = subject.resize(
            (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
            Image.Resampling.LANCZOS,
        )
        x = index % columns * cell_size + (cell_size - subject.width) // 2
        y = index // columns * cell_size + (cell_size - subject.height) // 2
        output_image.alpha_composite(subject, (x, y))
    if any(not cell for cell in cells):
        raise ValueError(f"{path.name}: empty cell {cells.index([])}")
    output_image.save(path, optimize=True)
    return len(items)


def main():
    for set_id in SETS:
        path = OFFICIAL / f"{set_id}.png"
        print(set_id, repack(path))
    print("supplies", repack(OFFICIAL / "supplies.png", columns=5, rows=5, count=21, cell_size=256))


if __name__ == "__main__":
    main()
