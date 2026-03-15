import { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode = 200,
  message?: string
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  return res.status(statusCode).json(payload);
};

export const sendSuccessWithMeta = <T>(
  res: Response,
  data: T,
  meta: ApiResponse['meta'],
  statusCode = 200
): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (
  res: Response,
  error: string,
  statusCode = 500
): Response => {
  const payload: ApiResponse = {
    success: false,
    error,
  };
  return res.status(statusCode).json(payload);
};
