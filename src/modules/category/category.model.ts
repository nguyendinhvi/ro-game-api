import mongoose, { Schema, Document, Model } from 'mongoose';
import { CategoryStatus } from './category.interface';
import { jsonTransform } from '../../utils/mongoose';

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
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        return jsonTransform(_doc, ret);
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ name: 1 });
categorySchema.index({ status: 1 });
categorySchema.index({ created_at: -1 });

export const CategoryModel: Model<ICategoryDocument> = mongoose.model<ICategoryDocument>(
  'Category',
  categorySchema,
);
