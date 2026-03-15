import mongoose from 'mongoose';
import { CategoryModel, mapDocToCategory, toMongoCreate, toMongoUpdate } from './category.model';
import type { ICategory, ICategoryCreate, ICategoryUpdate, ICategoryQuery } from './category.interface';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class CategoryService {
  async create(data: ICategoryCreate): Promise<ICategory> {
    const doc = await CategoryModel.create(toMongoCreate(data));
    return mapDocToCategory(doc);
  }

  async findById(id: string): Promise<ICategory | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await CategoryModel.findById(id);
    return doc ? mapDocToCategory(doc) : null;
  }

  async findBySlug(slug: string): Promise<ICategory | null> {
    const doc = await CategoryModel.findOne({ slug });
    return doc ? mapDocToCategory(doc) : null;
  }

  async findMany(query: ICategoryQuery): Promise<{
    data: ICategory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, query.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, query.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.slug) filter.slug = query.slug;
    if (query.status) filter.status = query.status;

    const sort: Record<string, 1 | -1> = {};
    switch (query.sort) {
      case 'newest':
      default:
        sort.created_at = -1;
        break;
    }

    const [docs, total] = await Promise.all([
      CategoryModel.find(filter).sort(sort).skip(skip).limit(limit),
      CategoryModel.countDocuments(filter),
    ]);

    const data = docs.map((d) => mapDocToCategory(d));
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  async update(id: string, data: ICategoryUpdate): Promise<ICategory | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await CategoryModel.findByIdAndUpdate(
      id,
      { $set: toMongoUpdate(data) },
      { new: true, runValidators: true },
    );
    return doc ? mapDocToCategory(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await CategoryModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const categoryService = new CategoryService();

