import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";
import { env } from "../config/env.js";

export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  let error = err;

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
    error = new AppError("Validation failed", 400, "VALIDATION_ERROR", details);
  } else if (!(error instanceof AppError)) {
    const statusCode = (error as { statusCode?: number }).statusCode || 500;
    const message = error.message || "An unexpected error occurred";
    error = new AppError(message, statusCode, "INTERNAL_SERVER_ERROR");
  }

  const appErr = error as AppError;

  // Log system errors
  if (!appErr.isOperational || appErr.statusCode >= 500) {
    logger.error(
      {
        err: appErr,
        method: req.method,
        url: req.originalUrl,
      },
      "Unhandled Server Error"
    );
  } else {
    logger.warn(
      {
        code: appErr.code,
        statusCode: appErr.statusCode,
        method: req.method,
        url: req.originalUrl,
      },
      appErr.message
    );
  }

  const responsePayload: {
    success: false;
    error: {
      code: string;
      message: string;
      details?: Array<{ field?: string; message: string }>;
      stack?: string;
    };
  } = {
    success: false,
    error: {
      code: appErr.code,
      message: appErr.message,
      ...(appErr.details && { details: appErr.details }),
      ...(env.NODE_ENV === "development" && { stack: appErr.stack }),
    },
  };

  res.status(appErr.statusCode).json(responsePayload);
};
