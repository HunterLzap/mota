"""Verify atlas geometry and report same-slot image differences."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OFFICIAL = ROOT / "images/items/artwork/official"
OUTPUT = ROOT / "output/official-item-reference-2026-11-01"
SETS = ["starter", "courage", "destiny_goddess", "sagael_set", "judge", "guardian_knight", "wargod_set"]
PARTS = ["helmet", "armor", "pants", "cloak", "gloves", "boots", "belt", "necklace", "ring", "weapon", "staff", "bow"]


def cell(image, index, columns, rows):
    width, height = image.size
    x0, x1 = index % columns * width / columns, (index % columns + 1) * width / columns
    y0, y1 = index // columns * height / rows, (index // columns + 1) * height / rows
    return image.crop((round(x0), round(y0), round(x1), round(y1)))


def main():
    hashes = {}
    preview = Image.new("RGB", (len(SETS) * 180, len(PARTS) * 180), "#24241f")
    draw = ImageDraw.Draw(preview)
    for column, set_id in enumerate(SETS):
        with Image.open(OFFICIAL / f"{set_id}.png") as source:
            image = source.convert("RGBA")
        assert image.size[0] % 4 == 0 and image.size[1] % 3 == 0
        for index, part in enumerate(PARTS):
            art = cell(image, index, 4, 3)
            alpha = art.getchannel("A")
            coverage = sum(alpha.histogram()[16:]) / (art.width * art.height)
            assert 0.01 < coverage < 0.7, (set_id, part, coverage)
            if part not in ("staff", "bow"):
                hashes[(set_id, part)] = art.resize((64, 64)).tobytes()
            art.thumbnail((150, 150))
            preview.paste(art, (column * 180 + 15, index * 180 + 22), art)
            draw.text((column * 180 + 6, index * 180 + 4), f"{set_id}:{part}", fill="#e6d9b8")
    for part in PARTS[:10]:
        assert len({hashes[(set_id, part)] for set_id in SETS}) == len(SETS), f"{part} repeats a redraw cell"
    with Image.open(OFFICIAL / "supplies.png") as source:
        supplies = source.convert("RGBA")
    assert supplies.width % 5 == 0 and supplies.height % 5 == 0
    for index in range(21):
        art = cell(supplies, index, 5, 5)
        assert art.getchannel("A").getbbox(), f"supply {index} is empty"
    preview.save(OUTPUT / "redraw-contact-sheet.jpg")
    print({"sets": len(SETS), "distinctSlots": len(hashes), "supplies": 21, "passed": True})


if __name__ == "__main__":
    main()
