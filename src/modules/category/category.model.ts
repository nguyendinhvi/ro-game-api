import mongoose, { Schema, Document, Model } from 'mongoose';
import {
  ICategory,
  ICategoryCreate,
  ICategoryUpdate,
  CategoryStatus,
} from './category.interface';

interface ICategoryDocumentRaw {
  name: string;
  slug: string;
  description?: string;
  status: CategoryStatus;
  created_at: Date;
  updated_at: Date;
}

export interface ICategoryDocument extends ICategoryDocumentRaw, Document {
  _id: mongoose.Types.ObjectId;
}

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      required: true,
      enum: ['active', 'hidden'] as CategoryStatus[],
      default: 'active',
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ created_at: -1 });

function toCategory(doc: ICategoryDocument): ICategory {
  const obj = doc.toObject() as ICategoryDocumentRaw;
  return {
    id: doc._id.toString(),
    name: obj.name,
    slug: obj.slug,
    description: obj.description,
    status: obj.status,
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
  };
}

function toMongoCreate(input: ICategoryCreate): Record<string, unknown> {
  return {
    name: input.name,
    slug: input.slug,
    description: input.description,
    status: input.status ?? 'active',
  };
}

function toMongoUpdate(input: ICategoryUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.name !== undefined) out.name = input.name;
  if (input.description !== undefined) out.description = input.description;
  if (input.status !== undefined) out.status = input.status;
  return out;
}

export const CategoryModel: Model<ICategoryDocument> = mongoose.model<ICategoryDocument>(
  'Category',
  categorySchema,
);

export function mapDocToCategory(doc: ICategoryDocument): ICategory {
  return toCategory(doc);
}

export { toMongoCreate, toMongoUpdate };

