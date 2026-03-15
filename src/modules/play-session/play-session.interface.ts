import type { IGame } from '../game/game.interface';

export type PlaySessionStatus = 'active' | 'completed';

export interface IPlaySession {
  id: string;
  user_id: string;
  game_id: string;
  game?: IGame;
  started_at: Date;
  ended_at?: Date;
  duration_seconds: number;
  status: PlaySessionStatus;
  created_at: Date;
  updated_at: Date;
}

export interface IPlaySessionUserSummary {
  user_id: string;
  email: string;
  display_name?: string;
  session_count: number;
  total_duration_seconds: number;
}

export interface IPlaySessionGameSummary {
  game_id: string;
  game: IGame;
  session_count: number;
  total_duration_seconds: number;
}

export interface IPlaySessionStats {
  total_sessions: number;
  total_duration_seconds: number;
  active_sessions: number;
  unique_users: number;
  unique_games: number;
  top_users: IPlaySessionUserSummary[];
  top_games: IPlaySessionGameSummary[];
}

export interface IPlaySessionStartBody {
  game_id: string;
}

export interface IPlaySessionQuery {
  page?: number;
  limit?: number;
  user_id?: string;
  game_id?: string;
  search?: string;
  status?: PlaySessionStatus;
}

export interface IPlaySessionListItem extends IPlaySession {
  user_email?: string;
  user_display_name?: string;
}
