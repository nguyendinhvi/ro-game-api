import mongoose, { Schema, Document, Model } from "mongoose";
import {
  IGame,
  IGameCreate,
  IGameUpdate,
  GameOrientation,
  GameStatus,
} from "./game.interface";

interface IGameDocumentRaw {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  cover_image: string;
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
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

gameSchema.index({ slug: 1 }, { unique: true });
gameSchema.index({ category_ids: 1 });
gameSchema.index({ tags: 1 });
gameSchema.index({ "stats.plays": -1 });
gameSchema.index({ created_at: -1 });

function toGame(doc: IGameDocument): IGame {
  const obj = doc.toObject() as IGameDocumentRaw;
  return {
    id: doc._id.toString(),
    title: obj.title,
    slug: obj.slug,
    description: obj.description,
    thumbnail: obj.thumbnail,
    coverImage: obj.cover_image,
    iframeUrl: obj.iframe_url,
    orientation: obj.orientation,
    categoryIds: obj.category_ids ?? [],
    tags: obj.tags ?? [],
    developer: obj.developer,
    stats: {
      plays: obj.stats?.plays ?? 0,
      likes: obj.stats?.likes ?? 0,
      rating: obj.stats?.rating ?? 0,
      ratingCount: obj.stats?.rating_count ?? 0,
    },
    monetization: {
      adsEnabled: obj.monetization?.ads_enabled ?? false,
      rewardAds: obj.monetization?.reward_ads ?? false,
    },
    status: obj.status,
    featured: obj.featured ?? false,
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
  };
}

export const GameModel: Model<IGameDocument> = mongoose.model<IGameDocument>(
  "Game",
  gameSchema,
);

export function mapDocToGame(doc: IGameDocument): IGame {
  return toGame(doc);
}

function toMongoCreate(input: IGameCreate): Record<string, unknown> {
  return {
    title: input.title,
    slug: input.slug,
    description: input.description,
    thumbnail: input.thumbnail,
    cover_image: input.coverImage,
    iframe_url: input.iframeUrl,
    orientation: input.orientation,
    category_ids: input.categoryIds,
    tags: input.tags,
    developer: input.developer,
    stats: {
      plays: input.stats?.plays ?? 0,
      likes: input.stats?.likes ?? 0,
      rating: input.stats?.rating ?? 0,
      rating_count: input.stats?.ratingCount ?? 0,
    },
    monetization: {
      ads_enabled: input.monetization?.adsEnabled ?? false,
      reward_ads: input.monetization?.rewardAds ?? false,
    },
    status: input.status ?? "draft",
    featured: input.featured ?? false,
  };
}

function toMongoUpdate(input: IGameUpdate): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (input.title !== undefined) out.title = input.title;
  if (input.description !== undefined) out.description = input.description;
  if (input.thumbnail !== undefined) out.thumbnail = input.thumbnail;
  if (input.coverImage !== undefined) out.cover_image = input.coverImage;
  if (input.iframeUrl !== undefined) out.iframe_url = input.iframeUrl;
  if (input.orientation !== undefined) out.orientation = input.orientation;
  if (input.categoryIds !== undefined) out.category_ids = input.categoryIds;
  if (input.tags !== undefined) out.tags = input.tags;
  if (input.developer !== undefined) out.developer = input.developer;
  if (input.stats !== undefined) {
    out.stats = {
      plays: input.stats.plays ?? 0,
      likes: input.stats.likes ?? 0,
      rating: input.stats.rating ?? 0,
      rating_count: input.stats.ratingCount ?? 0,
    };
  }
  if (input.monetization !== undefined) {
    out.monetization = {
      ads_enabled: input.monetization.adsEnabled ?? false,
      reward_ads: input.monetization.rewardAds ?? false,
    };
  }
  if (input.status !== undefined) out.status = input.status;
  if (input.featured !== undefined) out.featured = input.featured;
  return out;
}

export { toMongoCreate, toMongoUpdate };
