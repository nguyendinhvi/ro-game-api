import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  email: string;
  jti: string;
}

export function signAccessToken(payload: Omit<JwtPayload, 'jti'>): string {
  return createAccessToken(payload).access_token;
}

export function createAccessToken(
  payload: Omit<JwtPayload, 'jti'>,
): { access_token: string; jti: string } {
  const jti = crypto.randomUUID();
  const access_token = jwt.sign({ ...payload, jti }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  } as jwt.SignOptions);
  return { access_token, jti };
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}
