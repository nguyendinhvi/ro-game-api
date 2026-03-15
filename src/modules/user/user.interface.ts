import type { Request } from 'express';

export type UserRequest<B = unknown> = Request & { body: B };

export interface IUser {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserCreate {
  email: string;
  password: string;
  displayName?: string;
}

export interface ILoginBody {
  email: string;
  password: string;
}

export type RegisterBody = IUserCreate;
export type LoginBody = ILoginBody;

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
}
