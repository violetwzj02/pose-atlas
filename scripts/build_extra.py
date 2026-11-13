#!/usr/bin/env python3
"""Build Shisei + CharaDB metadata (no images)."""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
ANGLES = ["front", "diag", "side", "above", "below"]
SERIES = [
    {"key": "std", "zh": "全身·标准", "en": "Full body · standard", "ja": "全身・標準", "adult": False},
    {"key": "upper", "zh": "上半身", "en": "Upper body", "ja": "上半身", "adult": False},
    {"key": "sexy", "zh": "全身·性感", "en": "Full body · sexy", "ja": "全身・セクシー", "adult": True},
    {"key": "duo", "zh": "双人", "en": "Pair", "ja": "二人", "adult": True},
]
ANGLE_META = [
    {"key": "front", "zh": "正面", "en": "Front", "ja": "正面"},
    {"key": "diag", "zh": "斜角", "en": "Three-quarter", "ja": "斜め"},
    {"key": "side", "zh": "侧面", "en": "Side", "ja": "横"},
    {"key": "above", "zh": "俯视", "en": "High angle", "ja": "上から"},
    {"key": "below", "zh": "仰视", "en": "Low angle", "ja": "下から"},
]
HAIR_SUBS = [
    {"key": "style", "zh": "发型", "en": "Hairstyle", "ja": "髪型"},
    {"key": "bangs", "zh": "刘海", "en": "Bangs", "ja": "前髪"},
    {"key": "color", "zh": "发色", "en": "Hair color", "ja": "髪色"},
    {"key": "acc", "zh": "发饰", "en": "Hair accessory", "ja": "髪飾り"},
    {"key": "eye_color", "zh": "眼睛颜色", "en": "Eye color", "ja": "目の色"},
    {"key": "eye_shape", "zh": "眼睛形状", "en": "Eye shape", "ja": "瞳の形"},
]
COLOR_NAMES = {
    "brown": {"zh": "棕色", "en": "brown", "ja": "茶", "tag": "brown hair", "hex": "#6b3e26"},
    "black": {"zh": "黑色", "en": "black", "ja": "黒", "tag": "black hair", "hex": "#15151a"},
    "blonde": {"zh": "金色", "en": "blonde", "ja": "金", "tag": "blonde hair", "hex": "#f3d36b"},
    "pink": {"zh": "粉色", "en": "pink", "ja": "ピンク", "tag": "pink hair", "hex": "#ff8fc8"},
    "silver": {"zh": "银色", "en": "silver", "ja": "銀", "tag": "silver hair", "hex": "#cfd3dc"},
}


def dump(name: str, obj) -> None:
    path = DATA / name
    text = "/* 自动生成：scripts/build_extra.py — 仅文字元数据，不含图片 */\nwindow." + name.replace(".js", "").replace("shisei", "PA_SHISEI").replace("characters", "PA_CHARA") + "=" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n"
    # fix names
    if name == "shisei.js":
        text = "/* 自动生成：scripts/build_extra.py — 仅文字元数据，不含图片 */\nwindow.PA_SHISEI=" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n"
    elif name == "characters.js":
        text = "/* 自动生成：scripts/build_extra.py — 仅文字元数据，不含图片 */\nwindow.PA_CHARA=" + json.dumps(obj, ensure_ascii=False, separators=(",", ":")) + ";\n"
    path.write_text(text)
    print(f"wrote {path} {path.stat().st_size} bytes")


def build_shisei() -> dict:
    raw = json.loads((Path(__file__).parent / "shisei-catalog.json").read_text())
    items = []
    cats = {}
    n_views = 0
    for p in raw:
        files = {a: p.get("views", {}).get(a) for a in ANGLES if p.get("views", {}).get(a)}
        if not files:
            continue
        n_views += len(files)
        adult = p.get("series") in ("sexy", "duo") or p.get("rating") == "suggestive"
        cat_key = p.get("class_cn") or p.get("class_jp") or "其他"
        cats.setdefault(cat_key, {"key": cat_key, "zh": p.get("class_cn") or cat_key, "en": p.get("class_en") or cat_key, "ja": p.get("class_jp") or cat_key})
        items.append({
            "id": p["id"],
            "no": p["id"],
            "s": p["series"],
            "c": cat_key,
            "zh": p.get("name_cn") or p.get("name_jp") or p["id"],
            "en": p.get("name_en") or p["id"],
            "ja": p.get("name_jp") or p["id"],
            "desc": p.get("desc_en") or "",
            "a": [a for a in ANGLES if a in files],
            "files": files,
            "adult": bool(adult),
            "rating": p.get("rating") or "general",
        })
    return {
        "home": "https://shisei.indaloop.app/",
        "media": "https://shisei.indaloop.app/",
        "github": "https://github.com/wquguru/shisei",
        "license": "CC0 1.0",
        "version": "0.4.1",
        "series": SERIES,
        "angles": ANGLE_META,
        "categories": list(cats.values()),
        "items": items,
        "counts": {"poses": len(items), "images": n_views},
    }


def hair_sub(item: dict) -> str:
    sub = item.get("sub")
    cat = item.get("cat")
    if sub == "eye":
        return "eye_shape" if cat == "瞳の形" else "eye_color"
    return sub or ""


def build_chara() -> dict:
    db = json.loads((Path(__file__).parent / "chara-photoai.json").read_text())
    cats = [{"ja": a[0], "zh": a[1]} for a in db["cats"]]
    variants: dict[str, list[str]] = {}
    for vid, parent in db["variants"]:
        color = vid.split("-", 1)[1]
        variants.setdefault(parent, []).append(color)
    items = []
    for r in db["items"]:
        cid, jp, zh, tags, cat_i, adult = r
        cat = cats[cat_i]
        set_ = "hair" if cid[0] == "H" else "outfit" if cid[0] == "O" else "pose"
        # infer sub from category index for hair
        sub = ""
        if set_ == "hair":
            # 0 style, 1 bangs, 2 color, 3 acc, 4 eye color, 5 eye shape
            sub = {0: "style", 1: "bangs", 2: "color", 3: "acc", 4: "eye_color", 5: "eye_shape"}.get(cat_i, "")
        it = {
            "id": cid,
            "set": set_,
            "cat": cat["ja"],
            "catZh": cat["zh"],
            "zh": zh,
            "jp": jp,
            "tags": tags,
            "sub": sub,
            "adult": bool(adult),
            "line": set_ == "pose",
        }
        cols = variants.get(cid)
        if cols:
            # brown is the unsuffixed default image
            it["colors"] = ["brown"] + [c for c in ("black", "blonde", "pink", "silver") if c in cols]
        items.append(it)
    # also keep variant records as lightweight entries for fav/deep links
    var_items = []
    by_id = {i["id"]: i for i in items}
    for vid, parent in db["variants"]:
        base = by_id.get(parent)
        if not base:
            continue
        color = vid.split("-", 1)[1]
        cn = COLOR_NAMES.get(color)
        if not cn:
            continue
        var_items.append({
            "id": vid,
            "set": base["set"],
            "cat": base["cat"],
            "catZh": base["catZh"],
            "zh": base["zh"] + "（" + cn["zh"] + "）",
            "jp": base["jp"] + "(" + cn["ja"] + ")",
            "tags": base["tags"] + ", " + cn["tag"],
            "sub": "style_color",
            "parent": parent,
            "color": color,
            "adult": base["adult"],
            "line": False,
        })
    n_base = len(items)
    n_var = len(var_items)
    return {
        "home": "https://charadb-2fi.pages.dev/",
        "author": "たき AI",
        "authorUrl": "https://x.com/taki_auto",
        "built": db.get("built") or "2026-11-02",
        "colors": COLOR_NAMES,
        "subs": HAIR_SUBS,
        "cats": cats,
        "sets": [
            {"key": "hair", "zh": "头发与眼睛", "en": "Hair & eyes", "ja": "髪と目"},
            {"key": "outfit", "zh": "服装", "en": "Outfits", "ja": "衣装"},
            {"key": "pose", "zh": "姿势", "en": "Poses", "ja": "ポーズ"},
        ],
        "items": items,
        "variants": var_items,
        "counts": {
            "base": n_base,
            "hair": sum(1 for i in items if i["set"] == "hair"),
            "outfit": sum(1 for i in items if i["set"] == "outfit"),
            "pose": sum(1 for i in items if i["set"] == "pose"),
            "variants": n_var,
            "adult": sum(1 for i in items if i["adult"]),
        },
    }


def main() -> None:
    shi = build_shisei()
    cha = build_chara()
    dump("shisei.js", shi)
    dump("characters.js", cha)
    print("shisei", shi["counts"])
    print("chara", cha["counts"])
    # series counts
    from collections import Counter
    print("shisei series", Counter(i["s"] for i in shi["items"]))
    print("shisei adult", sum(1 for i in shi["items"] if i["adult"]))


if __name__ == "__main__":
    main()
