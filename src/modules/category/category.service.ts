import mongoose from 'mongoose';
import { CategoryModel } from './category.model';
import type { ICategory, ICategoryCreate, ICategoryUpdate, ICategoryQuery } from './category.interface';
import { definedFields, serializeDoc, serializeDocs } from '../../utils/mongoose';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export class CategoryService {
  async create(data: ICategoryCreate): Promise<ICategory> {
    const doc = await CategoryModel.create(data);
    return serializeDoc<ICategory>(doc);
  }

  async findById(id: string): Promise<ICategory | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await CategoryModel.findById(id);
    return doc ? serializeDoc<ICategory>(doc) : null;
  }

  async findBySlug(slug: string): Promise<ICategory | null> {
    const doc = await CategoryModel.findOne({ slug });
    return doc ? serializeDoc<ICategory>(doc) : null;
  }

  async findMany(query: ICategoryQuery): Promise<{
    data: ICategory[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
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

    const data = serializeDocs<ICategory>(docs);
    const total_pages = Math.ceil(total / limit);

    return { data, total, page, limit, total_pages };
  }

  async update(id: string, data: ICategoryUpdate): Promise<ICategory | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await CategoryModel.findByIdAndUpdate(
      id,
      { $set: definedFields(data) },
      { new: true, runValidators: true },
    );
    return doc ? serializeDoc<ICategory>(doc) : null;
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.isValidObjectId(id)) return false;
    const result = await CategoryModel.findByIdAndDelete(id);
    return result !== null;
  }
}

export const categoryService = new CategoryService();
