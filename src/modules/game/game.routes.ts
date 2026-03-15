import { Router, Request } from 'express';
import { gameController } from './game.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import type { IGameCreate, IGameUpdate, IGameQuery } from './game.interface';

export interface GameIdParam {
  id: string;
}

export interface CreateGameBody extends IGameCreate {}
export interface UpdateGameBody extends IGameUpdate {}

export type GameRequest<P = unknown, Params = unknown, Q = unknown> = Request & {
  body: P;
  params: Params;
  query: Q;
};

function parseListQuery(query: Record<string, unknown>): IGameQuery {
  const pageRaw = query.page ? parseInt(String(query.page), 10) : undefined;
  const limitRaw = query.limit ? parseInt(String(query.limit), 10) : undefined;
  const featured =
    query.featured === 'true' ? true : query.featured === 'false' ? false : undefined;
  const status =
    query.status === 'draft' || query.status === 'published' || query.status === 'hidden'
      ? query.status
      : undefined;
  const sort =
    query.sort === 'newest' || query.sort === 'most_played' || query.sort === 'rating'
      ? query.sort
      : undefined;
  const result: IGameQuery = {};
  if (Number.isInteger(pageRaw) && (pageRaw as number) > 0) {
    result.page = pageRaw as number;
  }
  if (Number.isInteger(limitRaw) && (limitRaw as number) > 0) {
    result.limit = limitRaw as number;
  }
  if (typeof query.category === 'string') result.category = query.category;
  if (typeof query.tag === 'string') result.tag = query.tag;
  if (typeof featured === 'boolean') result.featured = featured;
  if (status) result.status = status;
  if (sort) result.sort = sort;
  return result;
}

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as GameRequest<CreateGameBody>;
    await gameController.create(typedReq, res);
  })
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = parseListQuery(req.query as Record<string, unknown>);
    const typedReq: GameRequest<unknown, unknown, IGameQuery> = Object.assign(req, {
      query: parsed,
    });
    await gameController.list(typedReq, res);
  })
);

router.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as GameRequest<unknown, { slug: string }>;
    await gameController.getBySlug(typedReq, res);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as GameRequest<unknown, GameIdParam>;
    await gameController.getById(typedReq, res);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as GameRequest<UpdateGameBody, GameIdParam>;
    await gameController.update(typedReq, res);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as GameRequest<unknown, GameIdParam>;
    await gameController.delete(typedReq, res);
  })
);

export const gameRoutes = router;
