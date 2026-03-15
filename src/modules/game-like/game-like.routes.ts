import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { gameLikeController } from './game-like.controller';
import type { IGameLikeQuery } from './game-like.interface';

function parseListQuery(query: Record<string, unknown>): IGameLikeQuery {
  const pageRaw = query.page ? parseInt(String(query.page), 10) : undefined;
  const limitRaw = query.limit ? parseInt(String(query.limit), 10) : undefined;

  const result: IGameLikeQuery = {};
  if (Number.isInteger(pageRaw) && (pageRaw as number) > 0) {
    result.page = pageRaw as number;
  }
  if (Number.isInteger(limitRaw) && (limitRaw as number) > 0) {
    result.limit = limitRaw as number;
  }
  return result;
}

const router = Router();

router.post(
  '/toggle',
  authenticate,
  asyncHandler(async (req, res) => {
    await gameLikeController.toggle(req, res);
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const parsed = parseListQuery(req.query as Record<string, unknown>);
    const typedReq = Object.assign(req, { query: parsed });
    await gameLikeController.myLikes(typedReq, res);
  }),
);

router.get(
  '/status/:gameId',
  authenticate,
  asyncHandler(async (req, res) => {
    await gameLikeController.status(req, res);
  }),
);

export const gameLikeRoutes = router;
