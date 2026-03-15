import { Response } from "express";
import { sendSuccess, sendSuccessWithMeta } from "../../utils/response";
import { gameService } from "./game.service";
import { AppError } from "../../middleware/errorHandler";
import type {
  GameRequest,
  GameIdParam,
  CreateGameBody,
  UpdateGameBody,
} from "./game.routes";
import type { IGameQuery, IRelatedGamesQuery } from "./game.interface";

export class GameController {
  async create(
    req: GameRequest<CreateGameBody>,
    res: Response,
  ): Promise<Response> {
    const game = await gameService.create(req.body);
    return sendSuccess(res, game, 201);
  }

  async getById(
    req: GameRequest<unknown, GameIdParam>,
    res: Response,
  ): Promise<Response> {
    const game = await gameService.findById(req.params.id);
    if (!game) throw new AppError(404, "Game not found");
    return sendSuccess(res, game);
  }

  async getBySlug(
    req: GameRequest<unknown, { slug: string }>,
    res: Response,
  ): Promise<Response> {
    const game = await gameService.findBySlug(req.params.slug);
    if (!game) throw new AppError(404, "Game not found");
    return sendSuccess(res, game);
  }

  async getRelated(
    req: GameRequest<unknown, { slug: string }, IRelatedGamesQuery>,
    res: Response,
  ): Promise<Response> {
    const game = await gameService.findBySlug(req.params.slug);
    if (!game) throw new AppError(404, "Game not found");

    const limitRaw = req.query.limit
      ? parseInt(String(req.query.limit), 10)
      : undefined;
    const limit =
      Number.isInteger(limitRaw) && (limitRaw as number) > 0
        ? (limitRaw as number)
        : 9;

    const related = await gameService.findRelated(req.params.slug, limit);
    return sendSuccess(res, related);
  }

  async list(
    req: GameRequest<unknown, unknown, IGameQuery>,
    res: Response,
  ): Promise<Response> {
    const { data, total, page, limit, total_pages } =
      await gameService.findMany(req.query);
    return sendSuccessWithMeta(res, data, { page, limit, total, total_pages });
  }

  async update(
    req: GameRequest<UpdateGameBody, GameIdParam>,
    res: Response,
  ): Promise<Response> {
    const game = await gameService.update(req.params.id, req.body);
    if (!game) throw new AppError(404, "Game not found");
    return sendSuccess(res, game);
  }

  async delete(
    req: GameRequest<unknown, GameIdParam>,
    res: Response,
  ): Promise<Response> {
    const deleted = await gameService.delete(req.params.id);
    if (!deleted) throw new AppError(404, "Game not found");
    return sendSuccess(res, { deleted: true }, 200);
  }
}

export const gameController = new GameController();
