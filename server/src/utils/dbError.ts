import mongoose from "mongoose";
import { AppError } from "./AppError.js";

export const handleDatabaseError = (error: unknown): never => {
  // Pass-through if already an AppError instance
  if (error instanceof AppError) {
    throw error;
  }

  // Handle Mongoose Validation Error
  if (error instanceof mongoose.Error.ValidationError) {
    const details = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
    throw new AppError("Database validation failed", 400, "VALIDATION_ERROR", details);
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId format)
  if (error instanceof mongoose.Error.CastError) {
    throw new AppError(
      `Invalid value for field ${error.path}`,
      400,
      "INVALID_ID",
      [{ field: error.path, message: `Cast to ${error.kind} failed` }]
    );
  }

  // Handle MongoDB Driver Duplicate Key Error (Code 11000)
  const mongoErr = error as { code?: number; keyValue?: Record<string, unknown> };
  if (mongoErr && mongoErr.code === 11000) {
    const keys = mongoErr.keyValue ? Object.keys(mongoErr.keyValue).join(", ") : "resource";
    throw new AppError(
      `Duplicate resource: ${keys} already exists`,
      409,
      "DUPLICATE_RESOURCE",
      mongoErr.keyValue
        ? Object.entries(mongoErr.keyValue).map(([field, val]) => ({
            field,
            message: `${field} '${val}' already exists`,
          }))
        : undefined
    );
  }

  // Fallback for unknown database errors
  const message = error instanceof Error ? error.message : "Database operation failed";
  throw new AppError(message, 500, "DATABASE_ERROR");
};
