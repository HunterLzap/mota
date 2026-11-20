"""Export individual transparent item PNGs and a browsable provenance gallery."""

import html
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/official-item-reference-2026-11-01"
ATLAS_ROOT = ROOT / "images/items/artwork/official"
EXPORT = OUTPUT / "individual"
PARTS = ["helmet", "armor", "pants", "cloak", "gloves", "boots", "belt", "necklace", "ring", "weapon", "staff", "bow"]
SETS = {
    "starter": {"game": [], "sourceParts": PARTS[:10]},
    "courage": {"game": ["courage"], "sourceParts": PARTS[:10]},
    "destiny_goddess": {"game": ["destiny_goddess"], "sourceParts": PARTS[:10]},
    "sagael_set": {"game": ["sagael_set"], "sourceParts": PARTS[:10]},
    "judge": {"game": ["judge"], "sourceParts": PARTS[:10]},
    "guardian_knight": {"game": ["guardian_knight"], "sourceParts": PARTS[:10]},
    "wargod_set": {"game": ["wargod_set"], "sourceParts": PARTS[:7]},
}
ITEMS = [
    "star_crystal", "socket_crystal", "refine_crystal", "protect_crystal", "goddess_blessing",
    "pet_egg_gold", "pet_egg_darkgold", "clear_crystal", "destiny_stone", "evolution_stone",
    "key_redwood", "key_bronze", "key_platinum", "chest_wood", "chest_iron", "chest_gold",
    "coin_scroll_small", "coin_scroll_medium", "coin_scroll_large", "pet_queue_normal", "pet_queue_advanced",
]
ITEM_GAME_BINDINGS = {
    "star_crystal": ["star_crystal"],
    "socket_crystal": ["socket_crystal", "crystal_socket", "diamond_1"],
    "protect_crystal": ["protect_crystal", "crystal_protect"],
    "pet_egg_gold": ["pet_egg_gold", "pet_egg_random", "pet_egg_blue"],
    "pet_egg_darkgold": ["pet_egg_darkgold", "pet_egg", "pet_egg_purplegold"],
    "destiny_stone": ["destiny_stone"],
    "evolution_stone": ["evolution_stone"],
    "key_redwood": ["key_redwood"],
    "key_bronze": ["key_bronze"],
    "key_platinum": ["key_platinum"],
}


def cell(image, index, columns, rows):
    width, height = image.size
    left, right = index % columns * width / columns, (index % columns + 1) * width / columns
    top, bottom = index // columns * height / rows, (index // columns + 1) * height / rows
    return image.crop((round(left), round(top), round(right), round(bottom)))


def export_cell(source, index, columns, rows, path):
    artwork = cell(source, index, columns, rows)
    artwork.thumbnail((256, 256), Image.Resampling.LANCZOS)
    artwork.save(path, optimize=True)
    return artwork.getbbox()


def main():
    EXPORT.mkdir(parents=True, exist_ok=True)
    manifest = {"equipment": [], "items": []}
    cards = []
    for set_id, config in SETS.items():
        with Image.open(ATLAS_ROOT / f"{set_id}.png") as source:
            atlas = source.convert("RGBA")
        for index, part in enumerate(PARTS):
            folder = EXPORT / "equipment"
            folder.mkdir(exist_ok=True)
            path = folder / f"{set_id}__{part}.png"
            box = export_cell(atlas, index, 4, 3, path)
            source_status = "original-source" if part in config["sourceParts"] else "supplemental-redraw"
            record = {
                "setId": set_id, "part": part, "artId": f"official_{set_id}_{part}",
                "gameSets": config["game"], "sourceStatus": source_status,
                "path": path.relative_to(ROOT).as_posix(), "visibleBounds": box,
            }
            if set_id == "starter":
                record["gameBindings"] = ["novice_weapon"] if part in ("weapon", "staff", "bow") else ["novice_armor"] if part == "armor" else []
            manifest["equipment"].append(record)
            cards.append(record)
    with Image.open(ATLAS_ROOT / "supplies.png") as source:
        supplies = source.convert("RGBA")
    for index, item_id in enumerate(ITEMS):
        folder = EXPORT / "items"
        folder.mkdir(exist_ok=True)
        path = folder / f"official_{item_id}.png"
        box = export_cell(supplies, index, 5, 5, path)
        record = {
            "itemId": item_id, "artId": f"official_{item_id}", "sourceStatus": "original-source",
            "gameBindings": ITEM_GAME_BINDINGS.get(item_id, []),
            "path": path.relative_to(ROOT).as_posix(), "visibleBounds": box,
        }
        manifest["items"].append(record)
        cards.append(record)
    manifest["counts"] = {
        "equipment": len(manifest["equipment"]),
        "items": len(manifest["items"]),
        "originalSourceCells": sum(row["sourceStatus"] == "original-source" for row in cards),
        "supplementalRedraws": sum(row["sourceStatus"] == "supplemental-redraw" for row in cards),
    }
    (OUTPUT / "individual-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    card_html = []
    for row in cards:
        label = row.get("artId")
        binding = ", ".join(row.get("gameBindings") or row.get("gameSets") or [])
        status = "原图参考重绘" if row["sourceStatus"] == "original-source" else "同套补绘"
        relative = Path(row["path"]).relative_to(OUTPUT.relative_to(ROOT)).as_posix()
        card_html.append(f"""<article class="{row['sourceStatus']}">
<img src="{html.escape(relative)}" alt="{html.escape(label)}">
<h3>{html.escape(label)}</h3><p>{status}</p><code>{html.escape(binding)}</code></article>""")
    gallery = f"""<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<title>官方参考装备道具图集</title>
<style>
body{{margin:0;padding:28px;background:#171813;color:#e6d8b8;font:14px/1.5 Georgia,"Noto Serif SC",serif}}
h1{{margin:0 0 6px;color:#e9c77d}}p.lead{{color:#b6aa8f;margin-top:0}}
main{{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}}
article{{padding:12px;background:#22231d;border:1px solid #61543b;border-radius:4px}}
article.supplemental-redraw{{border-color:#8d6a37}}img{{display:block;width:128px;height:128px;object-fit:contain;margin:auto;background:transparent}}
h3{{font-size:12px;margin:8px 0 2px;overflow-wrap:anywhere}}p{{margin:0;color:#c49f5c;font-size:11px}}code{{display:block;margin-top:5px;color:#a99e88;font-size:10px;overflow-wrap:anywhere}}
</style><body><h1>官方参考装备道具图集</h1>
<p class="lead">装备 {manifest['counts']['equipment']} 件，道具 {manifest['counts']['items']} 件；官网原图 {manifest['counts']['originalSourceCells']} 格，同套补绘 {manifest['counts']['supplementalRedraws']} 格。橙色边框为补绘。</p>
<main>{''.join(card_html)}</main></body></html>"""
    (OUTPUT / "index.html").write_text(gallery, encoding="utf-8")
    print(json.dumps(manifest["counts"], ensure_ascii=False))


if __name__ == "__main__":
    main()
