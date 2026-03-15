#!/usr/bin/env node
/**
 * Phân loại game vào danh mục dựa trên tags + title/slug.
 * - Game có thể thuộc nhiều danh mục
 * - Mỗi game ít nhất 1 danh mục (fallback: arcade)
 *
 * Usage:
 *   node scripts/assign-game-categories.js          # dry-run
 *   node scripts/assign-game-categories.js --apply  # ghi DB
 */

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/ro-game";
const APPLY = process.argv.includes("--apply");

/** @type {Array<{ slug: string; name: string; emoji: string; variant: string; order: number; description: string; tags: string[]; keywords: string[] }>} */
const CATEGORY_DEFS = [
  {
    slug: "brain",
    name: "Train your brain",
    emoji: "🧠",
    variant: "blue",
    order: 60,
    description: "Game rèn luyện trí não, giải đố và tư duy logic.",
    tags: [
      "puzzle", "logic", "brain", "thinking", "math", "sudoku", "wordsearch",
      "sort", "sorting", "matching", "match-3", "sliding-puzzle", "differences",
      "quiz", "number", "logical", "colormatch", "block", "merge", "color",
      "levels", "link", "connection", "hidden", "detective", "bubble shooter",
      "matching", "tetris",
    ],
    keywords: ["puzzle", "sort", "merge", "block", "sudoku", "match", "brain", "logic"],
  },
  {
    slug: "adrenaline",
    name: "Adrenaline",
    emoji: "🏎️",
    variant: "pink",
    order: 50,
    description: "Game tốc độ, hành động và cảm giác mạnh.",
    tags: [
      "action", "shooter", "shoot-em-up", "speed", "agility", "running", "runner",
      "flying", "fly", "bullet", "horror", "survival", "zombie", "battle",
      "beat-em-up", "apocalypse", "arrow", "aim", "blast", "skill", "3d", "geometry",
      "snake", "monster", "escape", "racing",
    ],
    keywords: ["race", "racing", "run", "runner", "drive", "subway", "shoot", "battle", "zombie"],
  },
  {
    slug: "friends",
    name: "Cùng bạn bè",
    emoji: "🙌",
    variant: "teal",
    order: 40,
    description: "Game nhiều người chơi, chơi cùng bạn bè.",
    tags: ["multiplayer", "2players", ".io"],
    keywords: ["multiplayer", "2 player", "two player"],
  },
  {
    slug: "quick",
    name: "5-minute fun",
    emoji: "☕",
    variant: "gold",
    order: 30,
    description: "Game ngắn, giải trí nhanh trong vài phút.",
    tags: ["casual", "timekiller", "clicker", "relaxing", "relax", "1player", "singleplayer", "idle"],
    keywords: ["casual", "quick", "idle", "clicker"],
  },
  {
    slug: "meme",
    name: "Meme & bloxy",
    emoji: "🧢",
    variant: "green",
    order: 20,
    description: "Game meme, Roblox và phong cách bloxy.",
    tags: ["roblox", "stickman", "minecraft"],
    keywords: ["roblox", "obby", "minecraft", "stickman"],
  },
  {
    slug: "classics",
    name: "Timeless classics",
    emoji: "🃏",
    variant: "purple",
    order: 10,
    description: "Game kinh điển vượt thời gian.",
    tags: ["snake", "tetris", "classic", "worm"],
    keywords: ["chess", "pool", "snake", "tetris", "classic", "solitaire"],
  },
  {
    slug: "puzzle",
    name: "Giải đố",
    emoji: "🧩",
    variant: "blue",
    order: 70,
    description: "Game giải đố, xếp hình và sắp xếp.",
    tags: [
      "puzzle", "block", "merge", "sort", "sorting", "matching", "match-3",
      "sliding-puzzle", "brain", "logic", "sudoku", "colormatch", "bubble shooter",
      "bubble", "tetris", "differences", "wordsearch", "number", "math",
    ],
    keywords: ["puzzle", "sort", "merge", "block blast", "match"],
  },
  {
    slug: "racing",
    name: "Đua xe",
    emoji: "🏁",
    variant: "pink",
    order: 65,
    description: "Game đua xe, lái xe và chạy đua.",
    tags: ["racing", "car", "runner", "running", "speed", "racing & driving"],
    keywords: ["race", "racing", "drive", "car", "moto", "subway", "run"],
  },
  {
    slug: "action",
    name: "Hành động",
    emoji: "⚔️",
    variant: "pink",
    order: 64,
    description: "Game hành động, bắn súng và chiến đấu.",
    tags: [
      "action", "shooter", "shoot-em-up", "battle", "beat-em-up", "zombie",
      "snake", "stickman", "agility", "arrow", "aim", "bullet", "monster",
    ],
    keywords: ["shoot", "battle", "fight", "war", "gun", "action"],
  },
  {
    slug: "sports",
    name: "Thể thao",
    emoji: "⚽",
    variant: "green",
    order: 63,
    description: "Game thể thao: bóng đá, bóng rổ, billiards và hơn thế.",
    tags: ["sports", "sport", "archery", "pool"],
    keywords: [
      "soccer", "football", "basketball", "basket", "penalty", "pool", "billiard",
      "golf", "tennis", "sport",
    ],
  },
  {
    slug: "simulation",
    name: "Mô phỏng",
    emoji: "🏗️",
    variant: "teal",
    order: 62,
    description: "Game mô phỏng, quản lý và chăm sóc.",
    tags: [
      "simulation", "idle", "tycoon", "fishing", "fish", "doctor", "cook", "care",
      "pet", "building", "business", "craft", "cleaning", "food", "health",
      "decor", "design", "family", "puppy", "monkey", "animal", "cat",
    ],
    keywords: ["sim", "doctor", "fishing", "tycoon", "mart", "farm", "cook", "care"],
  },
  {
    slug: "adventure",
    name: "Phiêu lưu",
    emoji: "🗺️",
    variant: "gold",
    order: 61,
    description: "Game phiêu lưu, khám phá và sống sót.",
    tags: ["adventure", "escape", "rpg", "role-play", "island", "survival", "horror", "apocalypse"],
    keywords: ["adventure", "escape", "explore", "quest", "world"],
  },
  {
    slug: "strategy",
    name: "Chiến thuật",
    emoji: "♟️",
    variant: "purple",
    order: 59,
    description: "Game chiến thuật và tư duy dài hạn.",
    tags: ["strategy", "chess"],
    keywords: ["chess", "strategy", "tower", "defense", "td"],
  },
  {
    slug: "arcade",
    name: "Arcade",
    emoji: "👾",
    variant: "gold",
    order: 55,
    description: "Game arcade cổ điển và giải trí.",
    tags: ["arcade", "2d", "pixel", "pixelart", "retro"],
    keywords: ["arcade"],
  },
];

function normalizeTag(tag) {
  return String(tag || "").toLowerCase().trim();
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function slugParts(slug) {
  return String(slug || "")
    .toLowerCase()
    .split("-")
    .filter(Boolean);
}

function matchesKeyword(keyword, game) {
  const k = keyword.toLowerCase();
  const text = `${game.title || ""} ${game.description || ""}`.toLowerCase();
  if (new RegExp(`\\b${escapeRegex(k)}\\b`).test(text)) return true;
  return slugParts(game.slug).some((part) => part === k);
}

function matchCategories(game) {
  const tags = new Set((game.tags || []).map(normalizeTag));
  const matched = new Set();

  for (const cat of CATEGORY_DEFS) {
    const tagHit = cat.tags.some((t) => tags.has(normalizeTag(t)));
    const keywordHit = cat.keywords.some((kw) => matchesKeyword(kw, game));
    if (tagHit || keywordHit) {
      matched.add(cat.slug);
    }
  }

  if (matched.size === 0) {
    matched.add("arcade");
  }

  return [...matched];
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const categoriesCol = db.collection("categories");
  const gamesCol = db.collection("games");

  const slugToId = new Map();

  for (const def of CATEGORY_DEFS) {
    const existing = await categoriesCol.findOne({ slug: def.slug });
    if (existing) {
      slugToId.set(def.slug, existing._id);
      if (APPLY) {
        await categoriesCol.updateOne(
          { _id: existing._id },
          {
            $set: {
              name: def.name,
              description: def.description,
              emoji: def.emoji,
              variant: def.variant,
              order: def.order,
              status: "active",
            },
          },
        );
      }
    } else if (APPLY) {
      const now = new Date();
      const result = await categoriesCol.insertOne({
        name: def.name,
        slug: def.slug,
        description: def.description,
        emoji: def.emoji,
        variant: def.variant,
        order: def.order,
        status: "active",
        created_at: now,
        updated_at: now,
      });
      slugToId.set(def.slug, result.insertedId);
      console.log(`+ Created category: ${def.name} (${def.slug})`);
    } else {
      console.log(`+ Would create category: ${def.name} (${def.slug})`);
    }
  }

  if (APPLY) {
    const allCats = await categoriesCol.find({ slug: { $in: CATEGORY_DEFS.map((c) => c.slug) } }).toArray();
    for (const cat of allCats) {
      slugToId.set(cat.slug, cat._id);
    }
  }

  const games = await gamesCol.find({}).toArray();
  const categoryCounts = Object.fromEntries(CATEGORY_DEFS.map((c) => [c.slug, 0]));
  const multiCount = { 1: 0, 2: 0, 3: 0, "4+": 0 };
  const samples = [];
  let updated = 0;

  for (const game of games) {
    const slugs = matchCategories(game);
    slugs.forEach((s) => {
      categoryCounts[s] = (categoryCounts[s] || 0) + 1;
    });

    if (slugs.length === 1) multiCount[1]++;
    else if (slugs.length === 2) multiCount[2]++;
    else if (slugs.length === 3) multiCount[3]++;
    else multiCount["4+"]++;

    if (samples.length < 8) {
      samples.push({ title: game.title, slugs, tags: game.tags });
    }

    if (APPLY) {
      const categoryIds = slugs
        .map((s) => slugToId.get(s))
        .filter(Boolean);

      if (categoryIds.length === 0) {
        console.warn(`WARN: No category ids for ${game.slug}`);
        continue;
      }

      await gamesCol.updateOne(
        { _id: game._id },
        { $set: { category_ids: categoryIds } },
      );
      updated++;
    }
  }

  console.log("\n=== Category assignment stats ===");
  console.log(`Games total: ${games.length}`);
  console.log(`Categories: ${CATEGORY_DEFS.length} defined`);
  console.log("\nGames per category:");
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([slug, count]) => console.log(`  ${slug.padEnd(12)} ${count}`));

  console.log("\nMulti-category distribution:");
  console.log(`  1 category: ${multiCount[1]}`);
  console.log(`  2 categories: ${multiCount[2]}`);
  console.log(`  3 categories: ${multiCount[3]}`);
  console.log(`  4+ categories: ${multiCount["4+"]}`);

  console.log("\nSample assignments:");
  samples.forEach((s) =>
    console.log(`  ${s.title}: [${s.slugs.join(", ")}] tags=${(s.tags || []).join(",")}`),
  );

  if (APPLY) {
    console.log(`\nUpdated ${updated} games.`);
  } else {
    console.log("\nDry-run only. Pass --apply to write to DB.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
