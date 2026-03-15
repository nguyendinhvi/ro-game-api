import { Response } from 'express';
import { sendSuccess, sendSuccessWithMeta } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import type { AuthRequest } from '../../middleware/authenticate';
import { gameLikeService } from './game-like.service';
import type { IGameLikeQuery, IGameLikeToggleBody } from './game-like.interface';

export class GameLikeController {
  async toggle(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const body = req.body as IGameLikeToggleBody;
    const result = await gameLikeService.toggle(userId, body.game_id);
    return sendSuccess(res, result);
  }

  async status(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const result = await gameLikeService.getStatus(userId, req.params.gameId);
    return sendSuccess(res, result);
  }

  async myLikes(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const query = req.query as IGameLikeQuery;
    const { data, total, page, limit, total_pages } =
      await gameLikeService.findByUser(userId, query);
    return sendSuccessWithMeta(res, data, { page, limit, total, total_pages });
  }
}

export const gameLikeController = new GameLikeController();
