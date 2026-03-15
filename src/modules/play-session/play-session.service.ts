import mongoose, { type Document } from "mongoose";
import { PlaySessionModel } from "./play-session.model";
import { GameModel } from "../game/game.model";
import { UserModel } from "../user/user.model";
import type {
  IPlaySession,
  IPlaySessionListItem,
  IPlaySessionQuery,
  IPlaySessionStats,
} from "./play-session.interface";
import type { IGame } from "../game/game.interface";
import { AppError } from "../../middleware/errorHandler";
import { serializeDoc, serializePopulatedRef } from "../../utils/mongoose";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class PlaySessionService {
  async start(userId: string, gameId: string): Promise<IPlaySession> {
    if (!mongoose.isValidObjectId(gameId)) {
      throw new AppError(400, "Invalid game id");
    }

    const game = await GameModel.findById(gameId);
    if (!game) throw new AppError(404, "Game not found");

    const activeSessions = await PlaySessionModel.find({
      user_id: userId,
      status: "active",
    });

    for (const session of activeSessions) {
      const endedAt = new Date();
      session.ended_at = endedAt;
      session.duration_seconds = Math.max(
        0,
        Math.floor((endedAt.getTime() - session.started_at.getTime()) / 1000),
      );
      session.status = "completed";
      await session.save();
    }

    const doc = await PlaySessionModel.create({
      user_id: userId,
      game_id: game._id,
      started_at: new Date(),
      duration_seconds: 0,
      status: "active",
    });

    await doc.populate("game_id");
    return this.serializeSession(doc);
  }

  private serializeSession(doc: Document): IPlaySession {
    const session = serializeDoc<IPlaySession>(doc);
    const game = serializePopulatedRef<IGame>(doc, "game_id");

    return {
      ...session,
      game_id: game?.id ?? String(session.game_id),
      game: game ?? undefined,
    };
  }

  async end(userId: string, sessionId: string): Promise<IPlaySession> {
    if (!mongoose.isValidObjectId(sessionId)) {
      throw new AppError(400, "Invalid session id");
    }

    const doc = await PlaySessionModel.findOne({
      _id: sessionId,
      user_id: userId,
    });
    if (!doc) throw new AppError(404, "Play session not found");
    if (doc.status === "completed") {
      await doc.populate("game_id");
      return this.serializeSession(doc);
    }

    const endedAt = new Date();
    doc.ended_at = endedAt;
    doc.duration_seconds = Math.max(
      0,
      Math.floor((endedAt.getTime() - doc.started_at.getTime()) / 1000),
    );
    doc.status = "completed";
    await doc.save();

    await doc.populate("game_id");
    return this.serializeSession(doc);
  }

  async findMany(query: IPlaySessionQuery): Promise<{
    data: IPlaySessionListItem[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const page = Math.max(1, query.page ?? DEFAULT_PAGE);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, query.limit ?? DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (query.user_id && mongoose.isValidObjectId(query.user_id)) {
      filter.user_id = new mongoose.Types.ObjectId(query.user_id);
    }
    if (query.game_id && mongoose.isValidObjectId(query.game_id)) {
      filter.game_id = new mongoose.Types.ObjectId(query.game_id);
    }
    if (query.status) filter.status = query.status;

    if (query.search?.trim()) {
      const escaped = query.search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      const matchingGames = await GameModel.find({
        $or: [{ title: regex }, { slug: regex }],
      }).select("_id");
      const gameIds = matchingGames.map((g) => g._id);
      if (gameIds.length === 0) {
        return { data: [], total: 0, page, limit, total_pages: 0 };
      }
      filter.game_id = { $in: gameIds };
    }

    const [docs, total] = await Promise.all([
      PlaySessionModel.find(filter)
        .sort({ started_at: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user_id", "email display_name")
        .populate("game_id"),
      PlaySessionModel.countDocuments(filter),
    ]);

    const data: IPlaySessionListItem[] = docs.map((doc) => {
      const session = this.serializeSession(doc);
      const user = serializePopulatedRef<{
        id: string;
        email?: string;
        display_name?: string;
      }>(doc, "user_id");

      if (!user) {
        return session;
      }

      return {
        ...session,
        user_id: user.id,
        user_email: user.email,
        user_display_name: user.display_name,
      };
    });

    return { data, total, page, limit, total_pages: Math.ceil(total / limit) };
  }

  async findByUser(userId: string, query: IPlaySessionQuery) {
    return this.findMany({ ...query, user_id: userId });
  }

  async getStats(
    query: Pick<IPlaySessionQuery, "user_id" | "game_id">,
  ): Promise<IPlaySessionStats> {
    const match: Record<string, unknown> = { status: "completed" };

    if (query.user_id && mongoose.isValidObjectId(query.user_id)) {
      match.user_id = new mongoose.Types.ObjectId(query.user_id);
    }
    if (query.game_id && mongoose.isValidObjectId(query.game_id)) {
      match.game_id = new mongoose.Types.ObjectId(query.game_id);
    }

    const [summary] = await PlaySessionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total_sessions: { $sum: 1 },
          total_duration_seconds: { $sum: "$duration_seconds" },
          unique_users: { $addToSet: "$user_id" },
          unique_games: { $addToSet: "$game_id" },
        },
      },
      {
        $project: {
          total_sessions: 1,
          total_duration_seconds: 1,
          unique_users: { $size: "$unique_users" },
          unique_games: { $size: "$unique_games" },
        },
      },
    ]);

    const active_sessions = await PlaySessionModel.countDocuments({
      status: "active",
    });

    const topUsersRaw = await PlaySessionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$user_id",
          session_count: { $sum: 1 },
          total_duration_seconds: { $sum: "$duration_seconds" },
        },
      },
      { $sort: { total_duration_seconds: -1 } },
      { $limit: 10 },
    ]);

    const topGamesSort: Record<string, 1 | -1> = query.user_id
      ? { last_played_at: -1 }
      : { total_duration_seconds: -1 };

    const topGamesMatch =
      query.user_id && mongoose.isValidObjectId(query.user_id)
        ? { user_id: new mongoose.Types.ObjectId(query.user_id) }
        : match;

    const topGamesRaw = await PlaySessionModel.aggregate([
      { $match: topGamesMatch },
      {
        $group: {
          _id: "$game_id",
          session_count: { $sum: 1 },
          total_duration_seconds: { $sum: "$duration_seconds" },
          last_played_at: { $max: "$started_at" },
        },
      },
      { $sort: topGamesSort },
      { $limit: 10 },
    ]);

    const userIds = topUsersRaw.map((row) => row._id);
    const gameIds = topGamesRaw.map((row) => row._id);
    const [users, games] = await Promise.all([
      UserModel.find({ _id: { $in: userIds } }).select("email display_name"),
      GameModel.find({ _id: { $in: gameIds } }),
    ]);
    const userMap = new Map(users.map((u) => [String(u._id), u]));
    const gameMap = new Map(
      games.map((g) => [String(g._id), serializeDoc<IGame>(g)]),
    );

    return {
      total_sessions: summary?.total_sessions ?? 0,
      total_duration_seconds: summary?.total_duration_seconds ?? 0,
      active_sessions,
      unique_users: summary?.unique_users ?? 0,
      unique_games: summary?.unique_games ?? 0,
      top_users: topUsersRaw.map((row) => {
        const user = userMap.get(String(row._id));
        return {
          user_id: String(row._id),
          email: user?.email ?? "",
          display_name: user?.display_name,
          session_count: row.session_count,
          total_duration_seconds: row.total_duration_seconds,
        };
      }),
      top_games: topGamesRaw
        .map((row) => {
          const game = gameMap.get(String(row._id));
          if (!game) return null;
          return {
            game_id: String(row._id),
            game,
            session_count: row.session_count,
            total_duration_seconds: row.total_duration_seconds,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    };
  }

  async getUserStats(userId: string) {
    return this.getStats({ user_id: userId });
  }

  async delete(sessionId: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(sessionId)) return false;
    const result = await PlaySessionModel.findByIdAndDelete(sessionId);
    return result !== null;
  }
}

export const playSessionService = new PlaySessionService();
