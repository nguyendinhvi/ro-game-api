import { Router, Request } from 'express';
import { categoryController } from './category.controller';
import { asyncHandler } from '../../utils/asyncHandler';
import type {
  ICategoryCreate,
  ICategoryUpdate,
  ICategoryQuery,
  CategoryStatus,
} from './category.interface';

export interface CategoryIdParam {
  id: string;
}

export interface CreateCategoryBody extends ICategoryCreate {}
export interface UpdateCategoryBody extends ICategoryUpdate {}

export type CategoryRequest<P = unknown, Params = unknown, Q = unknown> = Request & {
  body: P;
  params: Params;
  query: Q;
};

function parseListQuery(query: Record<string, unknown>): ICategoryQuery {
  const pageRaw = query.page ? parseInt(String(query.page), 10) : undefined;
  const limitRaw = query.limit ? parseInt(String(query.limit), 10) : undefined;

  const status =
    query.status === 'active' || query.status === 'hidden'
      ? (query.status as CategoryStatus)
      : undefined;

  const sort = query.sort === 'newest' ? 'newest' : undefined;

  const result: ICategoryQuery = {};
  if (Number.isInteger(pageRaw) && (pageRaw as number) > 0) {
    result.page = pageRaw as number;
  }
  if (Number.isInteger(limitRaw) && (limitRaw as number) > 0) {
    result.limit = limitRaw as number;
  }
  if (typeof query.slug === 'string') result.slug = query.slug;
  if (status) result.status = status;
  if (sort) result.sort = sort;
  return result;
}

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as CategoryRequest<CreateCategoryBody>;
    await categoryController.create(typedReq, res);
  }),
);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = parseListQuery(req.query as Record<string, unknown>);
    const typedReq: CategoryRequest<unknown, unknown, ICategoryQuery> = Object.assign(req, {
      query: parsed,
    });
    await categoryController.list(typedReq, res);
  }),
);

router.get(
  '/slug/:slug',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as CategoryRequest<unknown, { slug: string }>;
    await categoryController.getBySlug(typedReq, res);
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as CategoryRequest<unknown, CategoryIdParam>;
    await categoryController.getById(typedReq, res);
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as CategoryRequest<UpdateCategoryBody, CategoryIdParam>;
    await categoryController.update(typedReq, res);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const typedReq = req as unknown as CategoryRequest<unknown, CategoryIdParam>;
    await categoryController.delete(typedReq, res);
  }),
);

export const categoryRoutes = router;

