#!/usr/bin/env python3
"""Update game thumbnail/cover to full-size, non-square images."""

from __future__ import annotations

import json
import os
import re
import ssl
import time
import urllib.request

API = os.environ.get("API_URL", "http://localhost:3001/api")
UA = {"User-Agent": "Mozilla/5.0"}
CTX = ssl.create_default_context()


def fetch(url: str, method: str = "GET", data: bytes | None = None) -> str:
    headers = {**UA}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, context=CTX, timeout=30) as res:
        return res.read().decode("utf-8", errors="replace")


def pick_asset(assets: list[str], prefer: list[str]) -> str:
    for key in prefer:
        for asset in assets:
            if key in asset:
                return asset
    for asset in assets:
        if "512x512" not in asset:
            return asset
    return assets[0] if assets else ""


def poki_full(url: str) -> str:
    match = re.search(r"img\.poki-cdn\.com/cdn-cgi/image/[^/]+/([a-f0-9-]+)/([^/?\s]+)", url)
    if match:
        return f"https://img.poki-cdn.com/{match.group(1)}/{match.group(2)}"
    return url


def load_gd_catalog() -> dict[str, dict]:
    body = fetch("https://catalog.api.gamedistribution.com/api/v1.0/rss/All/")
    return {item["Md5"]: item for item in json.loads(body)}


def resolve_images(game: dict, gd_by_md5: dict[str, dict]) -> tuple[str, str]:
    thumb = game.get("thumbnail", "")
    cover = game.get("cover_image", "")
    iframe = game.get("iframe_url", "")

    if "poki-cdn.com/cdn-cgi" in thumb or "poki-cdn.com/cdn-cgi" in cover:
        full = poki_full(thumb or cover)
        return full, full

    if "gamedistribution.com" in iframe:
        match = re.search(r"gamedistribution\.com/([a-f0-9]+)", iframe)
        if match and match.group(1) in gd_by_md5:
            assets = gd_by_md5[match.group(1)].get("Asset") or []
            new_cover = pick_asset(assets, ["1280x720", "1280x550"])
            new_thumb = pick_asset(assets, ["1280x550", "1280x720", "200x120", "512x384"])
            if new_cover and new_thumb:
                return new_thumb, new_cover

    return thumb, cover


def main() -> None:
    gd_by_md5 = load_gd_catalog()
    games: list[dict] = []
    page = 1
    while True:
        data = json.loads(fetch(f"{API}/games?limit=100&page={page}"))
        games.extend(data["data"])
        if page >= data["meta"]["total_pages"]:
            break
        page += 1

    updated = 0
    for game in games:
        new_thumb, new_cover = resolve_images(game, gd_by_md5)
        if new_thumb == game["thumbnail"] and new_cover == game["cover_image"]:
            continue

        payload = json.dumps({"thumbnail": new_thumb, "cover_image": new_cover}).encode()
        result = json.loads(
            fetch(f"{API}/{game['id']}", method="PATCH", data=payload),
        )
        if result.get("success"):
            updated += 1
            print(f"OK {game['slug']}")
        time.sleep(0.03)

    print(f"\nUpdated {updated}/{len(games)} games")


if __name__ == "__main__":
    main()
