import { Types } from 'mongoose';

export type GameOrientation = 'portrait' | 'landscape';
export type GameStatus = 'draft' | 'published' | 'hidden';

export interface IGameDeveloper {
  name: string;
  website: string;
}

export interface IGameStats {
  plays: number;
  likes: number;
  rating: number;
  rating_count: number;
}

export interface IGameMonetization {
  ads_enabled: boolean;
  reward_ads: boolean;
}

export interface IGame {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  cover_image: string;
  preview_video_url?: string;
  iframe_url: string;
  orientation: GameOrientation;
  category_ids: Types.ObjectId[];
  tags: string[];
  developer: IGameDeveloper;
  stats: IGameStats;
  monetization: IGameMonetization;
  status: GameStatus;
  featured: boolean;
  order: number;
  created_at: Date;
  updated_at: Date;
}

export interface IGameCreate {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  cover_image: string;
  preview_video_url?: string;
  iframe_url: string;
  orientation: GameOrientation;
  category_ids: Types.ObjectId[];
  tags: string[];
  developer: IGameDeveloper;
  stats?: Partial<IGameStats>;
  monetization?: Partial<IGameMonetization>;
  status?: GameStatus;
  featured?: boolean;
  order?: number;
}

export interface IGameUpdate extends Partial<Omit<IGameCreate, 'slug'>> {}

export interface IGameQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  search?: string;
  featured?: boolean;
  status?: GameStatus;
  sort?: 'newest' | 'most_played' | 'rating';
}

export interface IRelatedGamesQuery {
  limit?: number;
}
