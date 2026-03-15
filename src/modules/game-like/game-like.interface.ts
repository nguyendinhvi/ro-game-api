import type { IGame } from '../game/game.interface';

export interface IGameLike {
  id: string;
  user_id: string;
  game_id: string;
  game?: IGame;
  created_at: Date;
}

export interface IGameLikeToggleBody {
  game_id: string;
}

export interface IGameLikeToggleResult {
  liked: boolean;
  likes_count: number;
}

export interface IGameLikeStatus {
  liked: boolean;
  likes_count: number;
}

export interface IGameLikeQuery {
  page?: number;
  limit?: number;
}

export interface IGameLikeListItem extends IGameLike {}
