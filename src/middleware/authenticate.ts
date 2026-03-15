import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { verifyAccessToken } from '../utils/jwt';
import { userService } from '../modules/user/user.service';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  accessToken?: string;
}

export function extractBearerToken(header?: string): string | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): void {
  void (async () => {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      next(new AppError(401, 'Unauthorized'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);

      if (
        payload.jti &&
        !(await userService.isSessionTokenValid(payload.sub, payload.jti))
      ) {
        next(new AppError(401, 'Token has been revoked'));
        return;
      }

      req.userId = payload.sub;
      req.userEmail = payload.email;
      req.accessToken = token;
      next();
    } catch {
      next(new AppError(401, 'Invalid or expired token'));
    }
  })().catch(next);
}
