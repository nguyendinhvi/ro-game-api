import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser, IUserCreate } from './user.interface';

interface IUserDocumentRaw {
  email: string;
  passwordHash: string;
  displayName?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IUserDocument extends IUserDocumentRaw, Document {
  _id: mongoose.Types.ObjectId;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true, select: false },
    displayName: { type: String, trim: true },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema.index({ email: 1 }, { unique: true });

function toUser(doc: IUserDocument): IUser {
  return {
    id: doc._id.toString(),
    email: doc.email,
    displayName: doc.displayName,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
  };
}

function toMongoCreate(input: IUserCreate, passwordHash: string): Record<string, unknown> {
  return {
    email: input.email.trim().toLowerCase(),
    passwordHash,
    displayName: input.displayName?.trim() || undefined,
  };
}

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>(
  'User',
  userSchema,
);

export function mapDocToUser(doc: IUserDocument): IUser {
  return toUser(doc);
}

export { toMongoCreate };
