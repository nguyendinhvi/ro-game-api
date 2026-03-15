import mongoose from 'mongoose';
import { GameModel, mapDocToGame, toMongoCreate, toMongoUpdate } from './game.model';
import type { IGame, IGameCreate, IGameUpdate, IGameQuery } from './game.interface';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class GameService {
  async create(data: IGameCreate): Promise<IGame> {
    const doc = await GameModel.create(toMongoCreate(data));
    return mapDocToGame(doc);
  }

  async findById(id: string): Promise<IGame | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await GameModel.findById(id);
    return doc ? mapDocToGame(doc) : null;
  }

  async findBySlug(slug: string): Promise<IGame | null> {
    const doc = await GameModel.findOne({ slug });
    return doc ? mapDocToGame(doc) : null;
  }

  async findMany(query: IGameQuery): Promise<{
    data: IGame[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.category) {
      if (mongoose.isValidObjectId(query.category)) {
        filter.category_ids = new mongoose.Types.ObjectId(query.category);
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

    const sort: Record<string, 1 | -1> = {};
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

    const [docs, total] = await Promise.all([
      GameModel.find(filter).sort(sort).skip(skip).limit(limit),
      GameModel.countDocuments(filter),
    ]);

    const data = docs.map((d) => mapDocToGame(d));
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  async update(id: string, data: IGameUpdate): Promise<IGame | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await GameModel.findByIdAndUpdate(
      id,
      { $set: toMongoUpdate(data) },
      { new: true, runValidators: true }
    );
    return doc ? mapDocToGame(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await GameModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const gameService = new GameService();
