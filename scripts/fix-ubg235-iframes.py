#!/usr/bin/env python3
"""Replace broken ubg235.pages.dev iframe URLs with working game sources."""

from __future__ import annotations

import json
import os
import re
import ssl
import time
import unicodedata
import urllib.request
from difflib import get_close_matches
from urllib.parse import urljoin

API = os.environ.get("API_URL", "http://localhost:3001/api/games")
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
CTX = ssl.create_default_context()

SKIP_IFRAME_HOSTS = (
    "googletagmanager.com",
    "discord.com",
    "facebook.com",
    "twitter.com",
)

OFFICIAL = {
    "slither-io": "http://slither.com/io",
    "agar-io": "https://agar.io",
    "diep-io": "https://diep.io",
    "krunker-io": "https://krunker.io",
    "hole-io": "https://hole-io.com",
    "paper-io": "https://paper-io.com",
    "shellshock-io": "https://shellshock.io",
    "bonk-io": "https://bonk.io",
    "little-big-snake": "https://littlebigsnake.com",
    "wormate-io": "https://wormate.io",
    "evowars-io": "https://evowars.io",
    "moomoo-io": "https://moomoo.io",
    "hexanaut-io": "https://hexanaut.io",
    "skribbl-io": "https://skribbl.io",
    "1v1-lol": "https://1v1.lol",
    "basketbros": "https://basketbros.io",
    "yohoho-io": "https://yohoho.io",
    "powerline-io": "http://powerline.io",
    "snake-io": "https://snake.io",
    "wings-io": "http://wings.io",
    "splix-io": "https://splix.io",
    "defly-io": "http://defly.io",
    "taming-io": "https://taming.io",
    "starve-io": "http://starve.io",
    "spinz-io": "http://spinz.io",
    "zombs-io": "https://zombsroyale.io",
    "narrow-one": "https://narrow.one",
    "ducklings-io": "https://ducklings.io",
    "buildroyale-io": "https://buildroyale.io",
    "territorial-io": "https://territorial.io",
    "sushi-party-io": "https://sushi-party.io",
    "vectaria-io": "https://vectaria.io/home",
    "rumble-rush": "https://rumblerush.io/",
    "obby-roads": "https://obbyroads.io/",
    "minefun-io": "https://minefun.io/",
}

ALIASES: dict[str, list[str]] = {
    "subway-surfers": [
        "https://www.bojiogame.sg/games/subwaysurfers-v01/game.html",
        "https://ubg98.github.io/SubwaySurfers/",
    ],
    "penalty-shooters-2": [
        "https://ubg98.github.io/PenaltyKickOnline/",
        "https://penaltykickonline.ubg235.com/",
    ],
    "retro-bowl": [
        "https://retrobowl.ubg235.com/",
        "https://ubg98.github.io/RetroBowl/",
    ],
    "tank-stars": [
        "https://games.crazygames.com/en_US/tank-stars-online/index.html",
    ],
    "my-perfect-hotel": [
        "https://myperfecthotel.io/",
        "https://kiz10.com/embed-play/my-perfect-hotel/",
    ],
    "slime-laboratory": [
        "https://unblockedgamesfree.github.io/slime-laboratory/",
    ],
}

INDEX_PATHS = [
    "/Users/mac/.cursor/projects/Users-mac-Documents-projects-ro-game/uploads/ubg235.pages.dev-0.md",
]


def fetch(url: str, method: str = "GET", data: bytes | None = None, timeout: int = 20) -> str:
    headers = {**UA}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, context=CTX, timeout=timeout) as res:
        return res.read().decode("utf-8", errors="replace")


def norm(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]", "", ascii_value.lower())


def compact(slug: str) -> str:
    return slug.replace("-", "")


def title_case_folder(slug: str) -> str:
    return "".join(part.capitalize() for part in slug.split("-"))


def slug_variants(slug: str) -> list[str]:
    variants = [slug, f"{slug}-online", f"{slug}-2", compact(slug)]
    seen: set[str] = set()
    ordered: list[str] = []
    for value in variants:
        if value and value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def is_broken_wrapper(html: str) -> bool:
    return "redirect_2025.js" in html and len(html) < 1200


def is_bad_iframe(url: str) -> bool:
    return "ubg235.pages.dev" in url or url.rstrip("/").endswith("/ubg98")


def pick_iframe_from_html(html: str, base_url: str) -> str | None:
    frames = re.findall(r'<iframe[^>]+src=["\']([^"\']+)["\']', html, re.I)
    for src in frames:
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            src = urljoin(base_url, src)
        if any(host in src for host in SKIP_IFRAME_HOSTS):
            continue
        if not is_bad_iframe(src):
            return src
    return None


def follow_nested_iframe(url: str) -> str | None:
    try:
        html = fetch(url)
    except OSError:
        return None

    nested = pick_iframe_from_html(html, url)
    if not nested:
        return None

    if nested == url:
        return nested

    if any(
        marker in nested
        for marker in (
            "cdn.kiz10.com",
            "minigamesville.com/gamelib",
            "minigamesville.com/wp-content",
            "html5.gamedistribution.com",
            "ubg98.github.io",
            "slope-game.github.io",
            "html5.gamemonetize.co",
            "g.igroutka.ru",
            "playhop.com/dist-app",
        )
    ):
        return nested

    try:
        html2 = fetch(nested)
    except OSError:
        return nested

    deeper = pick_iframe_from_html(html2, nested)
    if deeper and not is_bad_iframe(deeper):
        return deeper

    if len(html2) > 5000 and not re.search(r"<iframe", html2, re.I):
        return nested

    return nested


def is_direct_playable(html: str, url: str) -> bool:
    if url in OFFICIAL.values():
        return True

    if any(
        token in html.lower()
        for token in ("cocos", "phaser", "defold", "babylon", "unity", "wasm", "createjs")
    ):
        return True

    has_iframe_tag = bool(re.search(r"<iframe", html, re.I))
    return len(html) > 8000 and not has_iframe_tag


def resolve_from_url(url: str) -> str | None:
    try:
        html = fetch(url)
    except OSError:
        return None

    if is_broken_wrapper(html):
        return None

    nested = follow_nested_iframe(url)
    if nested and not is_bad_iframe(nested):
        return nested

    if is_direct_playable(html, url):
        return url

    return None


def load_ubg_domains() -> set[str]:
    for path in INDEX_PATHS:
        if os.path.exists(path):
            text = open(path, encoding="utf-8").read()
            return set(re.findall(r"([a-z0-9]+)\.ubg235\.com", text))
    return set()


def load_gd_by_title() -> dict[str, str]:
    body = fetch("https://catalog.api.gamedistribution.com/api/v1.0/rss/All/", timeout=90)
    mapping: dict[str, str] = {}
    for item in json.loads(body):
        key = norm(item.get("Title", ""))
        if key and key not in mapping:
            mapping[key] = f"https://html5.gamedistribution.com/{item['Md5']}/"
    return mapping


def candidate_urls(slug: str, title: str, ubg_domains: set[str], gd_by_title: dict[str, str]) -> list[str]:
    folder = title_case_folder(slug)
    cands: list[str] = []

    if slug in OFFICIAL:
        cands.append(OFFICIAL[slug])
    cands.extend(ALIASES.get(slug, []))

    for variant in slug_variants(slug):
        cands.extend(
            [
                f"https://games.crazygames.com/en_US/{variant}/index.html",
                f"https://minigamesville.com/play/{variant}/",
                f"https://kiz10.com/embed-play/{variant}/",
                f"https://www.miniplay.com/embed/{variant}",
                f"https://slope-game.github.io/newgame/{variant}/",
            ]
        )

    domain = compact(slug)
    if domain in ubg_domains:
        cands.append(f"https://{domain}.ubg235.com/")

    cands.extend(
        [
            f"https://ubg98.github.io/{folder}/",
            f"https://ubg44.github.io/{folder}/",
            f"https://www.bojiogame.sg/games/{slug}/game.html",
            f"https://unblockedgames76.gitlab.io/{slug}/",
            f"https://unblockedgames76.gitlab.io/game/{slug}.html",
            f"https://ubg66.gitlab.io/{slug}/",
            f"https://unblockedgamesfree.github.io/{slug}/",
        ]
    )

    title_key = norm(title)
    if title_key in gd_by_title:
        cands.append(gd_by_title[title_key])
    close = get_close_matches(title_key, gd_by_title.keys(), n=2, cutoff=0.88)
    for match in close:
        cands.append(gd_by_title[match])

    seen: set[str] = set()
    ordered: list[str] = []
    for url in cands:
        if url and url not in seen:
            seen.add(url)
            ordered.append(url)
    return ordered


def resolve_iframe(slug: str, title: str, current: str, ubg_domains: set[str], gd_by_title: dict[str, str]) -> str | None:
    for url in candidate_urls(slug, title, ubg_domains, gd_by_title):
        resolved = resolve_from_url(url)
        if resolved and resolved != current and not is_bad_iframe(resolved):
            return resolved
    return None


def main() -> None:
    ubg_domains = load_ubg_domains()
    gd_by_title = load_gd_by_title()

    games: list[dict] = []
    page = 1
    while True:
        data = json.loads(fetch(f"{API}?limit=100&page={page}"))
        games.extend(data["data"])
        if page >= data["meta"]["total_pages"]:
            break
        page += 1

    targets = [g for g in games if "ubg235.pages.dev" in g.get("iframe_url", "")]
    print(f"Broken ubg235 wrappers: {len(targets)}")

    updated = 0
    unresolved: list[str] = []

    for game in targets:
        new_iframe = resolve_iframe(
            game["slug"],
            game["title"],
            game["iframe_url"],
            ubg_domains,
            gd_by_title,
        )
        if not new_iframe:
            unresolved.append(game["slug"])
            continue

        payload = json.dumps({"iframe_url": new_iframe}).encode()
        result = json.loads(fetch(f"{API}/{game['id']}", method="PATCH", data=payload))
        if result.get("success"):
            updated += 1
            print(f"OK {game['slug']} -> {new_iframe}")
        else:
            unresolved.append(game["slug"])

        time.sleep(0.05)

    print(f"\nUpdated: {updated}")
    print(f"Unresolved: {len(unresolved)}")
    if unresolved:
        print(", ".join(unresolved))


if __name__ == "__main__":
    main()
