import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = (err as AppError).statusCode || 500;
  const isOperational = (err as AppError).isOperational !== false;

  console.error(`[ERROR] ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: err.name || 'Error',
    message: isOperational ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};