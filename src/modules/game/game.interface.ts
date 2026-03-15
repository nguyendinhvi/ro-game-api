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
  ratingCount: number;
}

export interface IGameMonetization {
  adsEnabled: boolean;
  rewardAds: boolean;
}

export interface IGame {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  coverImage: string;
  iframeUrl: string;
  orientation: GameOrientation;
  categoryIds: Types.ObjectId[];
  tags: string[];
  developer: IGameDeveloper;
  stats: IGameStats;
  monetization: IGameMonetization;
  status: GameStatus;
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IGameCreate {
  title: string;
  slug: string;
  description: string;
  thumbnail: string;
  coverImage: string;
  iframeUrl: string;
  orientation: GameOrientation;
  categoryIds: Types.ObjectId[];
  tags: string[];
  developer: IGameDeveloper;
  stats?: Partial<IGameStats>;
  monetization?: Partial<IGameMonetization>;
  status?: GameStatus;
  featured?: boolean;
}

export interface IGameUpdate extends Partial<Omit<IGameCreate, 'slug'>> {}

export interface IGameQuery {
  page?: number;
  limit?: number;
  category?: string;
  tag?: string;
  featured?: boolean;
  status?: GameStatus;
  sort?: 'newest' | 'most_played' | 'rating';
}
