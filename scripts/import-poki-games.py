#!/usr/bin/env python3
"""Import Poki-style games into Ro Game API.

Scrapes metadata from poki.com and uses playable iframe URLs from ubg235.
Skips games that already exist (by slug).

Usage:
  python3 scripts/import-poki-games.py
  API_URL=http://localhost:3001/api python3 scripts/import-poki-games.py
"""

from __future__ import annotations

import json
import os
import re
import ssl
import time
import unicodedata
import urllib.request
from urllib.error import HTTPError

API = os.environ.get("API_URL", "http://localhost:3001/api")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
CTX = ssl.create_default_context()
FEATURED = {
    "monkey-mart",
    "subway-surfers",
    "stick-merge",
    "penalty-shooters-2",
    "crossy-road",
    "master-chess",
    "retro-bowl",
    "minecraft",
}


def fetch(url: str, method: str = "GET", data: bytes | None = None, timeout: int = 25):
    headers = {**UA}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, context=CTX, timeout=timeout) as res:
        body = res.read().decode("utf-8", errors="replace")
        return res.status, body


def head_ok(url: str) -> bool:
    try:
        code, _ = fetch(url, method="HEAD", timeout=12)
        return code == 200
    except HTTPError as exc:
        return exc.code == 200
    except OSError:
        return False


def norm(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", ascii_value.lower())


def poki_full_image_url(url: str) -> str:
    match = re.search(r"img\.poki-cdn\.com/cdn-cgi/image/[^/]+/([a-f0-9-]+)/([^/?\s]+)", url)
    if match:
        return f"https://img.poki-cdn.com/{match.group(1)}/{match.group(2)}"
    return url


def guess_orientation(title: str, slug: str) -> str:
    text = f"{title} {slug}".lower()
    portrait_keys = ("puzzle", "sort", "merge", "idle", "tycoon", "dress", "nail", "hair", "doctor", "makeup")
    return "portrait" if any(key in text for key in portrait_keys) else "landscape"


def guess_tags(title: str, slug: str) -> list[str]:
    text = f"{title} {slug}".lower()
    rules = (
        ("puzzle", ("puzzle", "sort", "merge", "block")),
        ("racing", ("race", "run", "drive", "car", "moto", "subway")),
        ("action", ("shoot", "battle", "snake", "stick", "obby")),
        ("sports", ("soccer", "football", "basket", "pool", "penalty")),
        ("casual", ("idle", "tycoon", "sim", "merge", "mart")),
    )
    tags: list[str] = []
    for tag, keys in rules:
        if any(key in text for key in keys) and tag not in tags:
            tags.append(tag)
    return tags[:5] or ["arcade"]


def main() -> None:
    _, body = fetch(f"{API}/games?limit=500")
    existing = json.loads(body)["data"]
    existing_slugs = {game["slug"] for game in existing}
    existing_titles = {norm(game["title"]) for game in existing}
    existing_iframes = {game["iframe_url"] for game in existing}

    _, home = fetch("https://poki.com/en")
    poki_slugs = sorted(set(re.findall(r"/en/g/([a-z0-9-]+)", home)))

    created = 0
    skipped = 0

    for slug in poki_slugs:
        if slug in existing_slugs:
            skipped += 1
            continue

        iframe = f"https://ubg235.pages.dev/game/{slug}/"
        if not head_ok(iframe):
            skipped += 1
            continue

        title = slug.replace("-", " ").title()
        description = f"{title} — game HTML5 phổ biến kiểu Poki, chơi miễn phí trên Ro Game."
        thumbnail = ""

        try:
            _, page = fetch(f"https://poki.com/en/g/{slug}")
            og_title = re.search(r'property="og:title" content="([^"]+)"', page)
            og_desc = re.search(r'property="og:description" content="([^"]+)"', page)
            og_img = re.search(r'property="og:image" content="([^"]+)"', page)
            if og_title:
                title = re.sub(r"\s*-\s*Play.*$", "", og_title.group(1).split("|")[0]).strip()
            if og_desc:
                description = og_desc.group(1).strip()[:500]
            if og_img:
                thumbnail = poki_full_image_url(og_img.group(1))
        except OSError:
            pass

        if norm(title) in existing_titles or iframe in existing_iframes:
            skipped += 1
            continue

        payload = {
            "title": title,
            "slug": slug,
            "description": description,
            "thumbnail": thumbnail,
            "cover_image": thumbnail,
            "iframe_url": iframe,
            "orientation": guess_orientation(title, slug),
            "category_ids": [],
            "tags": guess_tags(title, slug),
            "developer": {"name": "Poki", "website": "https://poki.com"},
            "status": "published",
            "featured": slug in FEATURED,
        }

        _, response = fetch(
            f"{API}/games",
            method="POST",
            data=json.dumps(payload).encode(),
        )
        result = json.loads(response)
        if result.get("success"):
            created += 1
            existing_slugs.add(slug)
            existing_titles.add(norm(title))
            existing_iframes.add(iframe)
            print(f"OK {slug}")
        else:
            print(f"FAIL {slug}: {result.get('error')}")

        time.sleep(0.08)

    _, body = fetch(f"{API}/games?limit=1")
    total = json.loads(body)["meta"]["total"]
    print(f"\nCreated: {created}, skipped: {skipped}, total games: {total}")


if __name__ == "__main__":
    main()
