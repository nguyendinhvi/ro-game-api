import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response';
import { env } from '../config/env';
import mongoose from 'mongoose';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode);
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
    return sendError(res, message, 400);
  }

  if (err instanceof mongoose.Error.CastError) {
    return sendError(res, 'Invalid ID format', 400);
  }

  if (err.name === 'MongoServerError' && (err as { code?: number }).code === 11000) {
    return sendError(res, 'Duplicate field value', 409);
  }

  const statusCode = 500;
  const message =
    env.nodeEnv === 'production' ? 'Internal server error' : err.message;

  return sendError(res, message, statusCode);
};

export const notFoundHandler = (req: Request, res: Response): Response => {
  return sendError(res, `Not found: ${req.method} ${req.originalUrl}`, 404);
};
