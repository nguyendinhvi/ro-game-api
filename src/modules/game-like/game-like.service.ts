import mongoose, { type Document } from 'mongoose';
import { GameLikeModel } from './game-like.model';
import { GameModel } from '../game/game.model';
import type {
  IGameLike,
  IGameLikeListItem,
  IGameLikeQuery,
  IGameLikeStatus,
  IGameLikeToggleResult,
} from './game-like.interface';
import type { IGame } from '../game/game.interface';
import { AppError } from '../../middleware/errorHandler';
import { serializeDoc, serializePopulatedRef } from '../../utils/mongoose';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class GameLikeService {
  private serializeLike(doc: Document): IGameLike {
    const like = serializeDoc<IGameLike>(doc);
    const game = serializePopulatedRef<IGame>(doc, 'game_id');

    return {
      ...like,
      game_id: game?.id ?? String(like.game_id),
      game: game ?? undefined,
    };
  }

  private async getLikesCount(gameId: mongoose.Types.ObjectId): Promise<number> {
    const game = await GameModel.findById(gameId).select('stats.likes');
    return game?.stats?.likes ?? 0;
  }

  async toggle(userId: string, gameId: string): Promise<IGameLikeToggleResult> {
    if (!mongoose.isValidObjectId(gameId)) {
      throw new AppError(400, 'Invalid game id');
    }

    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    const game = await GameModel.findById(gameObjectId);
    if (!game) throw new AppError(404, 'Game not found');

    const existing = await GameLikeModel.findOne({
      user_id: userId,
      game_id: gameObjectId,
    });

    if (existing) {
      await existing.deleteOne();
      await GameModel.updateOne(
        { _id: gameObjectId, 'stats.likes': { $gt: 0 } },
        { $inc: { 'stats.likes': -1 } },
      );

      return {
        liked: false,
        likes_count: await this.getLikesCount(gameObjectId),
      };
    }

    await GameLikeModel.create({
      user_id: userId,
      game_id: gameObjectId,
    });
    await GameModel.updateOne({ _id: gameObjectId }, { $inc: { 'stats.likes': 1 } });

    return {
      liked: true,
      likes_count: await this.getLikesCount(gameObjectId),
    };
  }

  async getStatus(userId: string, gameId: string): Promise<IGameLikeStatus> {
    if (!mongoose.isValidObjectId(gameId)) {
      throw new AppError(400, 'Invalid game id');
    }

    const gameObjectId = new mongoose.Types.ObjectId(gameId);
    const game = await GameModel.findById(gameObjectId).select('stats.likes');
    if (!game) throw new AppError(404, 'Game not found');

    const liked = await GameLikeModel.exists({
      user_id: userId,
      game_id: gameObjectId,
    });

    return {
      liked: liked != null,
      likes_count: game.stats?.likes ?? 0,
    };
  }

  async findByUser(userId: string, query: IGameLikeQuery) {
    const page = Math.max(1, query.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const filter = { user_id: userId };

    const [docs, total] = await Promise.all([
      GameLikeModel.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate('game_id'),
      GameLikeModel.countDocuments(filter),
    ]);

    const data: IGameLikeListItem[] = docs.map((doc) => this.serializeLike(doc));

    return {
      data,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }
}

export const gameLikeService = new GameLikeService();
