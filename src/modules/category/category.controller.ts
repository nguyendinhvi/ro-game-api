import { Response } from 'express';
import { sendSuccess, sendSuccessWithMeta } from '../../utils/response';
import { categoryService } from './category.service';
import { AppError } from '../../middleware/errorHandler';
import type { ICategoryQuery } from './category.interface';
import type { CategoryRequest, CategoryIdParam, CreateCategoryBody, UpdateCategoryBody } from './category.routes';

export class CategoryController {
  async create(
    req: CategoryRequest<CreateCategoryBody>,
    res: Response,
  ): Promise<Response> {
    const category = await categoryService.create(req.body);
    return sendSuccess(res, category, 201);
  }

  async getById(
    req: CategoryRequest<unknown, CategoryIdParam>,
    res: Response,
  ): Promise<Response> {
    const category = await categoryService.findById(req.params.id);
    if (!category) throw new AppError(404, 'Category not found');
    return sendSuccess(res, category);
  }

  async getBySlug(
    req: CategoryRequest<unknown, { slug: string }>,
    res: Response,
  ): Promise<Response> {
    const category = await categoryService.findBySlug(req.params.slug);
    if (!category) throw new AppError(404, 'Category not found');
    return sendSuccess(res, category);
  }

  async list(
    req: CategoryRequest<unknown, unknown, ICategoryQuery>,
    res: Response,
  ): Promise<Response> {
    const { data, total, page, limit, totalPages } = await categoryService.findMany(req.query);
    return sendSuccessWithMeta(res, data, { page, limit, total, totalPages });
  }

  async update(
    req: CategoryRequest<UpdateCategoryBody, CategoryIdParam>,
    res: Response,
  ): Promise<Response> {
    const category = await categoryService.update(req.params.id, req.body);
    if (!category) throw new AppError(404, 'Category not found');
    return sendSuccess(res, category);
  }

  async delete(
    req: CategoryRequest<unknown, CategoryIdParam>,
    res: Response,
  ): Promise<Response> {
    const deleted = await categoryService.delete(req.params.id);
    if (!deleted) throw new AppError(404, 'Category not found');
    return sendSuccess(res, { deleted: true }, 200);
  }
}

export const categoryController = new CategoryController();

