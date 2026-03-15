import mongoose from 'mongoose';
import { GameModel } from './game.model';
import { CategoryModel } from '../category/category.model';
import type { IGame, IGameCreate, IGameUpdate, IGameQuery } from './game.interface';
import { definedFields, serializeDoc, serializeDocs } from '../../utils/mongoose';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

function buildListSort(query: IGameQuery): Record<string, 1 | -1> {
  const sort: Record<string, 1 | -1> = { order: -1 };

  switch (query.sort) {
    case 'most_played':
      sort['stats.plays'] = -1;
      break;
    case 'rating':
      sort['stats.rating'] = -1;
      sort['stats.rating_count'] = -1;
      break;
    case 'newest':
    default:
      sort.created_at = -1;
      break;
  }

  return sort;
}

export class GameService {
  async create(data: IGameCreate): Promise<IGame> {
    const doc = await GameModel.create(data);
    return serializeDoc<IGame>(doc);
  }

  async findById(id: string): Promise<IGame | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await GameModel.findById(id);
    return doc ? serializeDoc<IGame>(doc) : null;
  }

  async findBySlug(slug: string): Promise<IGame | null> {
    const doc = await GameModel.findOne({ slug });
    return doc ? serializeDoc<IGame>(doc) : null;
  }

  async findMany(query: IGameQuery): Promise<{
    data: IGame[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const page = Math.max(1, query.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.category) {
      if (mongoose.isValidObjectId(query.category)) {
        filter.category_ids = new mongoose.Types.ObjectId(query.category);
      } else {
        const category = await CategoryModel.findOne({ slug: query.category });
        if (!category) {
          return { data: [], total: 0, page, limit, total_pages: 0 };
        }
        filter.category_ids = category._id;
      }
    }
    if (query.tag) {
      filter.tags = query.tag;
    }
    if (typeof query.featured === 'boolean') {
      filter.featured = query.featured;
    }
    if (query.status) {
      filter.status = query.status;
    }

    if (query.search) {
      const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: regex },
        { slug: regex },
        { tags: regex },
        { 'developer.name': regex },
      ];
    }

    const sort = buildListSort(query);

    const [docs, total] = await Promise.all([
      GameModel.find(filter).sort(sort).skip(skip).limit(limit),
      GameModel.countDocuments(filter),
    ]);

    const data = serializeDocs<IGame>(docs);
    const total_pages = Math.ceil(total / limit);

    return { data, total, page, limit, total_pages };
  }

  async update(id: string, data: IGameUpdate): Promise<IGame | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await GameModel.findByIdAndUpdate(
      id,
      { $set: definedFields(data) },
      { new: true, runValidators: true },
    );
    return doc ? serializeDoc<IGame>(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await GameModel.findByIdAndDelete(id);
    return result !== null;
  }

  async findRelated(slug: string, limit = 9): Promise<IGame[]> {
    const current = await GameModel.findOne({ slug });
    if (!current) return [];

    const gameLimit = Math.min(MAX_LIMIT, Math.max(1, limit));
    const tags = current.tags ?? [];
    const categoryIds = current.category_ids ?? [];

    const match: Record<string, unknown> = {
      slug: { $ne: slug },
      status: 'published',
    };

    const orConditions: Record<string, unknown>[] = [];
    if (tags.length > 0) {
      orConditions.push({ tags: { $in: tags } });
    }
    if (categoryIds.length > 0) {
      orConditions.push({ category_ids: { $in: categoryIds } });
    }
    if (orConditions.length > 0) {
      match.$or = orConditions;
    }

    const scored = await GameModel.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: match },
      {
        $addFields: {
          related_score: {
            $add: [
              { $size: { $setIntersection: ['$tags', tags] } },
              { $size: { $setIntersection: ['$category_ids', categoryIds] } },
            ],
          },
        },
      },
      { $sort: { related_score: -1, order: -1, 'stats.plays': -1, created_at: -1 } },
      { $limit: gameLimit },
      { $project: { _id: 1 } },
    ]);

    let ids = scored.map((row) => row._id);

    if (ids.length < gameLimit) {
      const excludeIds = [current._id, ...ids];
      const fallback = await GameModel.find({
        _id: { $nin: excludeIds },
        slug: { $ne: slug },
        status: 'published',
      })
        .sort({ order: -1, 'stats.plays': -1, created_at: -1 })
        .limit(gameLimit - ids.length)
        .select('_id');

      ids = [...ids, ...fallback.map((doc) => doc._id)];
    }

    if (ids.length === 0) return [];

    const docs = await GameModel.find({ _id: { $in: ids } });
    const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
    const ordered = ids
      .map((id) => byId.get(String(id)))
      .filter((doc): doc is NonNullable<typeof doc> => doc != null);

    return serializeDocs<IGame>(ordered);
  }
}

export const gameService = new GameService();
