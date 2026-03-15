import mongoose, { Schema, Document, Model } from "mongoose";
import { jsonTransform } from "../../utils/mongoose";

interface IUserDocumentRaw {
  email: string;
  password_hash?: string;
  google_id?: string;
  display_name?: string;
  session_jti?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export type UserRole = "user" | "admin";

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
    password_hash: { type: String, select: false },
    google_id: { type: String, trim: true, sparse: true, unique: true },
    display_name: { type: String, trim: true },
    session_jti: { type: String, select: false },
    role: {
      type: String,
      enum: ["user", "admin"] as UserRole[],
      default: "user",
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform(_doc, ret) {
        return jsonTransform(_doc, ret, ["password_hash", "session_jti"]);
      },
    },
    toObject: { virtuals: true, versionKey: false },
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ created_at: -1 });
userSchema.index({ role: 1 });

export const UserModel: Model<IUserDocument> = mongoose.model<IUserDocument>(
  "User",
  userSchema,
);
