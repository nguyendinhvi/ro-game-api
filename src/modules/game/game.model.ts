import mongoose, { Schema, Document, Model } from "mongoose";
import {
  IGame,
  GameOrientation,
  GameStatus,
} from "./game.interface";
import { jsonTransform } from "../../utils/mongoose";

interface IGameDocumentRaw {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  cover_image: string;
  preview_video_url: string;
  iframe_url: string;
  orientation: GameOrientation;
  category_ids: mongoose.Types.ObjectId[];
  tags: string[];
  developer: IGame["developer"];
  stats: {
    plays: number;
    likes: number;
    rating: number;
    rating_count: number;
  };
  monetization: {
    ads_enabled: boolean;
    reward_ads: boolean;
  };
  status: GameStatus;
  featured: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface IGameDocument extends IGameDocumentRaw, Document {
  _id: mongoose.Types.ObjectId;
}

const developerSchema = new Schema(
  {
    name: { type: String, required: true },
    website: { type: String, required: true },
  },
  { _id: false },
);

const statsSchema = new Schema(
  {
    plays: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    rating_count: { type: Number, default: 0 },
  },
  { _id: false },
);

const monetizationSchema = new Schema(
  {
    ads_enabled: { type: Boolean, default: false },
    reward_ads: { type: Boolean, default: false },
  },
  { _id: false },
);

const gameSchema = new Schema<IGameDocument>(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: true },
    thumbnail: { type: String, required: true },
    cover_image: { type: String, required: true },
    preview_video_url: { type: String, default: "" },
    iframe_url: { type: String, required: true },
    orientation: {
      type: String,
      required: true,
      enum: ["portrait", "landscape"] as GameOrientation[],
    },
    category_ids: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    tags: [{ type: String }],
    developer: { type: developerSchema, required: true },
    stats: { type: statsSchema, default: () => ({}) },
    monetization: { type: monetizationSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["draft", "published", "hidden"] as GameStatus[],
      default: "draft",
    },
    featured: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
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

gameSchema.index({ slug: 1 }, { unique: true });
gameSchema.index({ category_ids: 1 });
gameSchema.index({ tags: 1 });
gameSchema.index({ "stats.plays": -1 });
gameSchema.index({ order: -1 });
gameSchema.index({ created_at: -1 });

export const GameModel: Model<IGameDocument> = mongoose.model<IGameDocument>(
  "Game",
  gameSchema,
);
