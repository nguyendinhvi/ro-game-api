import { Response } from 'express';
import { sendSuccess, sendSuccessWithMeta } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler';
import type { AuthRequest } from '../../middleware/authenticate';
import { playSessionService } from './play-session.service';
import type { IPlaySessionQuery, IPlaySessionStartBody } from './play-session.interface';

export class PlaySessionController {
  async start(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const body = req.body as IPlaySessionStartBody;
    const session = await playSessionService.start(userId, body.game_id);
    return sendSuccess(res, session, 201);
  }

  async end(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const session = await playSessionService.end(userId, req.params.id);
    return sendSuccess(res, session);
  }

  async list(req: AuthRequest, res: Response): Promise<Response> {
    const query = req.query as IPlaySessionQuery;
    const { data, total, page, limit, total_pages } =
      await playSessionService.findMany(query);
    return sendSuccessWithMeta(res, data, { page, limit, total, total_pages });
  }

  async myHistory(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const query = req.query as IPlaySessionQuery;
    const { data, total, page, limit, total_pages } =
      await playSessionService.findByUser(userId, query);
    return sendSuccessWithMeta(res, data, { page, limit, total, total_pages });
  }

  async stats(req: AuthRequest, res: Response): Promise<Response> {
    const query = req.query as Pick<IPlaySessionQuery, 'user_id' | 'game_id'>;
    const stats = await playSessionService.getStats(query);
    return sendSuccess(res, stats);
  }

  async myStats(req: AuthRequest, res: Response): Promise<Response> {
    const userId = req.userId;
    if (!userId) throw new AppError(401, 'Unauthorized');

    const stats = await playSessionService.getUserStats(userId);
    return sendSuccess(res, stats);
  }

  async delete(req: AuthRequest, res: Response): Promise<Response> {
    const deleted = await playSessionService.delete(req.params.id);
    if (!deleted) throw new AppError(404, 'Play session not found');
    return sendSuccess(res, { deleted: true });
  }
}

export const playSessionController = new PlaySessionController();
