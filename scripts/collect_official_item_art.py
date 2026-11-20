"""Download the two official item reference pages and their original raster images."""

import concurrent.futures
import hashlib
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import urlopen

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output/official-item-reference-2026-11-01"
PAGES = {
    "equipment": ("20140218014308", "22"),
    "items": ("20140218163153", "21"),
}
SET_IDS = [
    "starter", "destiny_goddess", "sagael_set", "judge", "guardian_knight",
    "courage", "tower_hero", "wargod_set", "yanuo_descendant",
    "dark_demon", "light_envoy",
]
ITEM_IDS = [
    "star_crystal", "socket_crystal", "refine_crystal", "protect_crystal",
    "goddess_blessing", "pet_egg_gold", "pet_egg_darkgold", "clear_crystal",
    "destiny_stone", "evolution_stone", "key_redwood", "key_bronze",
    "key_platinum", "chest_wood", "chest_iron", "chest_gold",
    "coin_scroll_small", "coin_scroll_medium", "coin_scroll_large",
    "pet_queue_normal", "pet_queue_advanced",
]


class ReferenceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.images = []
        self.text = []
        self.row = None
        self.rows = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "tr":
            self.row = {"text": [], "images": []}
        if tag == "img" and "/editor/uploadfile/" in attrs.get("src", ""):
            self.images.append({"url": attrs["src"], "precedingText": self.text[-5:]})
            if self.row is not None:
                self.row["images"].append(attrs["src"])

    def handle_endtag(self, tag):
        if tag == "tr" and self.row is not None:
            if self.row["images"]:
                self.rows.append(self.row)
            self.row = None

    def handle_data(self, text):
        text = text.strip()
        if text:
            self.text.append(text)
            if self.row is not None:
                self.row["text"].append(text)


def fetch(record):
    path = OUTPUT / "originals" / (record["id"] + Path(record["originalUrl"]).suffix)
    url = f'https://web.archive.org/web/20140218014308im_/{record["originalUrl"]}'
    errors = []
    for attempt in range(2):
        try:
            if not path.exists():
                with urlopen(url, timeout=30) as response:
                    data = response.read()
                    record["resolvedUrl"] = response.geturl()
                path.write_bytes(data)
            with Image.open(path) as image:
                record["size"] = list(image.size)
            record.update(
                status="downloaded", localPath=path.relative_to(ROOT).as_posix(),
                archiveUrl=url, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
            )
            break
        except Exception as error:
            errors.append(str(error))
    else:
        record.update(status="missing", errors=errors)
    return record


def main():
    (OUTPUT / "originals").mkdir(parents=True, exist_ok=True)
    records = []
    for category, (snapshot, page_id) in PAGES.items():
        path = OUTPUT / f"{category}-page.html"
        page_url = f"https://web.archive.org/web/{snapshot}/http://mtsj.37wan.com/html/yxzl/2010/0104/{page_id}.html"
        if not path.exists():
            path.write_bytes(urlopen(page_url.replace(snapshot + "/", snapshot + "id_/"), timeout=40).read())
        parser = ReferenceParser()
        parser.feed(path.read_text(encoding="utf-8"))
        identifiers = SET_IDS if category == "equipment" else ITEM_IDS
        if len(parser.images) != len(identifiers):
            raise ValueError(f"{category}: expected {len(identifiers)} images, found {len(parser.images)}")
        for key, image in zip(identifiers, parser.images):
            row = next((row for row in parser.rows if image["url"] in row["images"]), None)
            records.append({
                "id": key, "category": category, "snapshot": snapshot,
                "pageUrl": page_url, "originalUrl": image["url"],
                "description": row["text"] if row else image["precedingText"],
            })
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        records = list(pool.map(fetch, records))
    (OUTPUT / "sources.json").write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    for category in PAGES:
        group = [r for r in records if r["category"] == category and r["status"] == "downloaded"]
        if not group:
            continue
        columns = 6 if category == "equipment" else 7
        width, height = (285, 430) if category == "equipment" else (160, 140)
        sheet = Image.new("RGB", (columns * width, ((len(group) + columns - 1) // columns) * height), "#25241f")
        draw = ImageDraw.Draw(sheet)
        for i, record in enumerate(group):
            with Image.open(ROOT / record["localPath"]) as image:
                image = image.convert("RGB")
                image.thumbnail((width - 12, height - 40))
                x, y = (i % columns) * width, (i // columns) * height
                sheet.paste(image, (x + (width - image.width) // 2, y + 8))
                draw.text((x + 8, y + height - 26), record["id"], fill="#eee2c5")
        sheet.save(OUTPUT / f"original-{category}-contact-sheet.jpg")
    for record in records:
        print(record["id"], record["status"], record.get("size"), " / ".join(record["description"])[:110])


if __name__ == "__main__":
    main()
