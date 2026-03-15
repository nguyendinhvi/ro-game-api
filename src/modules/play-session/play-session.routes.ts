import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authenticate } from '../../middleware/authenticate';
import { playSessionController } from './play-session.controller';
import type { IPlaySessionQuery, PlaySessionStatus } from './play-session.interface';

function parseListQuery(query: Record<string, unknown>): IPlaySessionQuery {
  const pageRaw = query.page ? parseInt(String(query.page), 10) : undefined;
  const limitRaw = query.limit ? parseInt(String(query.limit), 10) : undefined;
  const status =
    query.status === 'active' || query.status === 'completed'
      ? (query.status as PlaySessionStatus)
      : undefined;

  const result: IPlaySessionQuery = {};
  if (Number.isInteger(pageRaw) && (pageRaw as number) > 0) {
    result.page = pageRaw as number;
  }
  if (Number.isInteger(limitRaw) && (limitRaw as number) > 0) {
    result.limit = limitRaw as number;
  }
  if (typeof query.user_id === 'string') result.user_id = query.user_id;
  if (typeof query.game_id === 'string') result.game_id = query.game_id;
  if (typeof query.search === 'string' && query.search.trim()) {
    result.search = query.search.trim();
  }
  if (status) result.status = status;
  return result;
}

function parseStatsQuery(query: Record<string, unknown>) {
  const result: Pick<IPlaySessionQuery, 'user_id' | 'game_id'> = {};
  if (typeof query.user_id === 'string') result.user_id = query.user_id;
  if (typeof query.game_id === 'string') result.game_id = query.game_id;
  return result;
}

const router = Router();

router.post(
  '/start',
  authenticate,
  asyncHandler(async (req, res) => {
    await playSessionController.start(req, res);
  }),
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    await playSessionController.myHistory(req, res);
  }),
);

router.get(
  '/stats/me',
  authenticate,
  asyncHandler(async (req, res) => {
    await playSessionController.myStats(req, res);
  }),
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const parsed = parseStatsQuery(req.query as Record<string, unknown>);
    const typedReq = Object.assign(req, { query: parsed });
    await playSessionController.stats(typedReq, res);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = parseListQuery(req.query as Record<string, unknown>);
    const typedReq = Object.assign(req, { query: parsed });
    await playSessionController.list(typedReq, res);
  }),
);

router.patch(
  '/:id/end',
  authenticate,
  asyncHandler(async (req, res) => {
    await playSessionController.end(req, res);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await playSessionController.delete(req, res);
  }),
);

export const playSessionRoutes = router;
