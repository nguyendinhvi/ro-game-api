#!/usr/bin/env python3
"""Scrape hover preview video URLs from Poki / CrazyGames and PATCH games in API."""

from __future__ import annotations

import json
import os
import re
import ssl
import time
import urllib.request
from urllib.error import HTTPError

API = os.environ.get("API_URL", "http://localhost:3001/api/games")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
CTX = ssl.create_default_context()

POKI_MP4 = re.compile(r"https://v\.poki-cdn\.com/[a-f0-9-]+/[^\"'\s]+\.mp4")
CRAZY_MP4 = re.compile(r"https://videos\.crazygames\.com/[^\"'\s]+\.mp4")


def fetch(url: str, method: str = "GET", data: bytes | None = None, timeout: int = 20) -> str:
    headers = {**UA}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, context=CTX, timeout=timeout) as res:
        return res.read().decode("utf-8", errors="replace")


def head_ok(url: str) -> bool:
    try:
        req = urllib.request.Request(url, headers=UA, method="HEAD")
        with urllib.request.urlopen(req, context=CTX, timeout=12) as res:
            return res.status == 200
    except HTTPError as exc:
        return exc.code == 200
    except OSError:
        return False


def scrape_poki(slug: str) -> str | None:
    try:
        html = fetch(f"https://poki.com/en/g/{slug}")
    except HTTPError as exc:
        if exc.code == 404:
            return None
        return None
    except OSError:
        return None

    match = POKI_MP4.search(html)
    return match.group(0) if match else None


def scrape_crazygames(slug: str) -> str | None:
    candidates = [
        f"https://www.crazygames.com/game/{slug}",
        f"https://games.crazygames.com/en_US/{slug}/index.html",
        f"https://www.crazygames.com/embed/{slug}",
    ]
    for page_url in candidates:
        try:
            html = fetch(page_url)
        except (HTTPError, OSError):
            continue

        match = CRAZY_MP4.search(html)
        if match:
            return match.group(0)

    return None


def resolve_preview(slug: str) -> str | None:
    for resolver in (scrape_poki, scrape_crazygames):
        url = resolver(slug)
        if url and head_ok(url):
            return url
    return None


def load_games() -> list[dict]:
    games: list[dict] = []
    page = 1
    while True:
        data = json.loads(fetch(f"{API}?limit=100&page={page}"))
        games.extend(data["data"])
        if page >= data["meta"]["total_pages"]:
            break
        page += 1
    return games


def main() -> None:
    games = load_games()
    targets = [
        g
        for g in games
        if not (g.get("preview_video_url") or "").strip()
    ]
    print(f"Games without preview video: {len(targets)} / {len(games)}")

    updated = 0
    skipped = 0

    for index, game in enumerate(targets, start=1):
        slug = game["slug"]
        preview = resolve_preview(slug)
        if not preview:
            skipped += 1
            if index % 25 == 0:
                print(f"[{index}/{len(targets)}] skipped so far: {skipped}")
            time.sleep(0.08)
            continue

        payload = json.dumps({"preview_video_url": preview}).encode()
        result = json.loads(fetch(f"{API}/{game['id']}", method="PATCH", data=payload))
        if result.get("success"):
            updated += 1
            print(f"OK {slug} -> {preview}")
        else:
            skipped += 1

        time.sleep(0.08)

    print(f"\nUpdated: {updated}")
    print(f"No preview found: {skipped}")


if __name__ == "__main__":
    main()
