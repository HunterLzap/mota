"""Remove the baked dark background from painted icon atlases.

The painterly subjects and all enclosed shadows are preserved. Only dark pixels
connected to the outer canvas are cleared, so interior material shadows are not
keyed out.
"""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ATLASES = [
    "images/ui/interface-emblems-v1.png",
    "images/portraits/character-heads-v1.png",
    "images/items/artwork/equipment-atlas-v1.png",
    "images/items/artwork/supplies-relics.png",
    "images/items/artwork/supplies-crafting.png",
    "images/items/artwork/supplies-alchemy.png",
    "images/items/artwork/sets-atlas-v1.png",
    "images/items/artwork/gems-runes.png",
]


def clear_outer_background(path: Path) -> None:
    with Image.open(path) as source:
        image = source.convert("RGBA")
    width, height = image.size
    # The atlas canvas is continuous, so clear from every outer edge.
    for y in range(0, height, 16):
        for x in (0, width - 1):
            ImageDraw.floodfill(image, (x, y), (0, 0, 0, 0), thresh=28)
    for x in range(0, width, 16):
        for y in (0, height - 1):
            ImageDraw.floodfill(image, (x, y), (0, 0, 0, 0), thresh=28)
    # Write atomically so an interrupted conversion cannot leave a broken atlas.
    temporary = path.with_suffix(".alpha-tmp.png")
    image.save(temporary, optimize=True)
    temporary.replace(path)


def main() -> None:
    for relative in ATLASES:
        path = ROOT / relative
        clear_outer_background(path)
        with Image.open(path) as image:
            print(f"{relative}: {image.mode} {image.size}, alpha={image.getchannel('A').getextrema()}")


if __name__ == "__main__":
    main()
