"""Crop the actual item cells; keep source coordinates and redraw references."""

import json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/official-item-reference-2026-11-01"
LAYOUT = [
    "helmet", "armor", "pants", "cloak", "gloves", "boots",
    "belt", "necklace", "ring", "weapon", "staff", "bow",
]
CLASSIC = {
    "helmet": (107, 25, 151, 68), "armor": (107, 85, 151, 128),
    "pants": (107, 206, 151, 249), "cloak": (181, 85, 225, 128),
    "gloves": (181, 146, 225, 189), "boots": (107, 286, 151, 329),
    "belt": (107, 146, 151, 189), "necklace": (181, 25, 225, 68),
    "ring": (33, 146, 77, 189), "weapon": (33, 85, 77, 128),
}
COURAGE = {
    "helmet": (81, 18, 114, 50), "armor": (81, 66, 114, 98),
    "pants": (81, 160, 114, 192), "cloak": (140, 66, 173, 98),
    "gloves": (140, 114, 173, 146), "boots": (81, 225, 114, 257),
    "belt": (81, 114, 114, 146), "necklace": (140, 18, 173, 50),
    "ring": (24, 114, 57, 146), "weapon": (24, 66, 57, 98),
}
HERO = {
    "helmet": (101, 18, 144, 61), "armor": (101, 78, 144, 121),
    "pants": (101, 198, 144, 241), "cloak": (175, 78, 218, 121),
    "gloves": (175, 138, 218, 181), "boots": (101, 279, 144, 322),
    "belt": (101, 138, 144, 181), "necklace": (175, 18, 218, 61),
    "ring": (27, 198, 70, 241), "weapon": (27, 78, 70, 121),
}
FORGE = {
    "helmet": (13, 33, 54, 74), "armor": (13, 102, 54, 143),
    "pants": (13, 240, 54, 281), "cloak": (173, 104, 214, 145),
    "gloves": (173, 173, 214, 214), "boots": (175, 33, 216, 74),
    "belt": (13, 171, 54, 212),
}
SET_PALETTES = {
    "destiny_goddess": "Icy silver and pale azure, wing-like sweeping points, blue gemstones, slender elegant talons, flowing pale-blue cloth. Preserve the source's turquoise serpent ring and crimson/gold curved sword.",
    "sagael_set": "Heavy blue-black iron and cold teal steel, severe closed visor, layered dark plate, cyan gemstone belt, dark teal cloak, ice-blue boots. Preserve the turquoise serpent ring and crimson/gold curved sword.",
    "judge": "Crimson lacquer and dark bronze, red closed face helmet, ivory rib-like chest plates, red leather crossed gauntlets, red/bronze boots, burnt-orange cloak. Preserve the green gemstone ring and crimson/gold curved sword.",
    "guardian_knight": "Weathered olive and tarnished brass armor, rounded closed visor with beak-like nose guard, winged gold belt, olive-gold cloak, sharp fluted greaves and crossed gauntlets. Preserve green gemstone ring and crimson/gold curved sword.",
    "courage": "Dark indigo and violet steel, enclosed pointed indigo helmet, sculpted purple torso with silver edges, lavender cloak, dark purple gauntlets and greaves, low silver-violet belt, branching antique-gold necklace. Preserve the jagged crimson sword and dark silver ring with icy-blue jewel.",
    "wargod_set": "Blue-black layered plate, tarnished gold ridges and edges, icy cyan gems, severe horned blue helmet, slender articulated fluted armor, blue-white flowing cloak. Keep source shapes for the seven supplied pieces. Supplement only the five source-empty slots with matching ring, pendant, sword, staff and bow.",
}


def main():
    (OUTPUT / "crops").mkdir(exist_ok=True)
    (OUTPUT / "references").mkdir(exist_ok=True)
    records = json.loads((OUTPUT / "sources.json").read_text(encoding="utf-8"))
    crops = []
    for record in records:
        if record["status"] != "downloaded":
            continue
        with Image.open(ROOT / record["localPath"]) as source:
            source = source.convert("RGBA")
            if record["category"] == "items":
                path = OUTPUT / "crops" / (record["id"] + ".png")
                source.save(path)
                crops.append({"key": record["id"], "sourceId": record["id"], "rect": [0, 0, *source.size], "path": path.relative_to(ROOT).as_posix()})
                continue
            key = record["id"]
            boxes = COURAGE if key == "courage" else HERO if key == "tower_hero" else FORGE if source.width > 300 else CLASSIC
            reference = Image.new("RGB", (768, 576), "#24241f")
            draw = ImageDraw.Draw(reference)
            for index, slot in enumerate(LAYOUT):
                x, y = index % 4 * 192, index // 4 * 192
                draw.text((x + 10, y + 6), f"{index + 1}: {slot}", fill="#e6d9b8")
                if slot not in boxes:
                    draw.text((x + 14, y + 84), "NO SOURCE", fill="#a69877")
                    continue
                rect = boxes[slot]
                crop = source.crop(rect)
                path = OUTPUT / "crops" / f"{key}-{slot}.png"
                crop.save(path)
                crops.append({"key": f"{key}:{slot}", "sourceId": key, "rect": list(rect), "path": path.relative_to(ROOT).as_posix()})
                preview = crop.resize((132, 132), Image.Resampling.NEAREST).convert("RGB")
                reference.paste(preview, (x + 30, y + 36))
            reference.save(OUTPUT / "references" / f"{key}-reference.png")
    (OUTPUT / "crops.json").write_text(json.dumps(crops, ensure_ascii=False, indent=2), encoding="utf-8")
    common = """Use case: stylized-concept. Asset type: production equipment sprite atlas.
Repaint the supplied low-resolution source cells as faithful high-resolution inventory icons. The reference image is a labeled 4-column by 3-row SOURCE CONTACT SHEET, not an output image to copy wholesale.
OUTPUT: exactly 4 equal columns and 3 equal rows, 12 square cells in a 4:3 canvas, at least 1536x1152 if possible. Each subject centered in its cell, contained within 76% of cell width/height, generous empty gutter. TRUE transparent background. No frames, no square backplates, no text, no labels, no checkerboard, no shadows crossing cells.
CELL ORDER, left-to-right: row 1 helmet, chest armor, trousers/greaves, cloak; row 2 gauntlets, boots (a pair), belt, necklace; row 3 ring, sword, mage staff, hunter bow.
First ten cells: preserve every source item's silhouette, orientation, main color relationships, jewel locations, and recognizable ornament. Do not merge parts. Staff and bow are new matching designs based on the same set materials, not alleged original sprites.
Style: Classic 2006 vintage dark fantasy MMORPG inventory sprites, Eudemons Online, Diablo 2 retro 2.5D gritty hand-painted aesthetic, rough hand-painted forged metal, worn edges, carved ornament, deep gothic shadows, subtle confined magical highlights. Readable when reduced to 48px. These are painted game assets, never photos or shiny product renders.
Avoid photorealistic, photo, 3D render, smooth plastic, modern mobile game, cute cartoon, anime, kawaii, glossy slick digital art, vector sticker, pristine metal, candy lighting, glowing gold borders.
Set-specific invariants: """
    for key, palette in SET_PALETTES.items():
        (OUTPUT / "references" / f"{key}-prompt.txt").write_text(common + palette, encoding="utf-8")
    print("Saved", len(crops), "original crops and", len(SET_PALETTES), "redraw specifications")


if __name__ == "__main__":
    main()
