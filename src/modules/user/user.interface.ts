import type { Request } from 'express';

export interface RegisterBody extends IUserCreate {}

export type UserRequest<P = unknown, Params = unknown, Q = unknown> = Request & {
  body: P;
  params: Params;
  query: Q;
};

export type UserRole = "user" | "admin";

export interface IUser {
  id: string;
  email: string;
  display_name?: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  display_name?: string;
}

export interface ILoginBody {
  email: string;
  password: string;
}

export interface IGoogleLoginBody {
  id_token: string;
}

export interface IUserQuery {
  page?: number;
  limit?: number;
  sort?: 'newest';
}

export interface IUserDailyPoint {
  label: string;
  date: string;
  count: number;
}

export interface IUserDailyAnalytics {
  days: number;
  points: IUserDailyPoint[];
  previous_points: IUserDailyPoint[];
  current_period_label: string;
  previous_period_label: string;
  summary: {
    total: number;
    period_total: number;
    previous_period_total: number;
    today: number;
    admin_count: number;
  };
}

export interface IUserAnalyticsQuery {
  days?: number;
}

export type LoginBody = ILoginBody;
export type GoogleLoginBody = IGoogleLoginBody;

export interface IAuthResponse {
  user: IUser;
  access_token: string;
  token_type: 'Bearer';
  expires_in: string;
}
