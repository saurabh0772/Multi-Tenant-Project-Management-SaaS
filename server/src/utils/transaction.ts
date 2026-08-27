import mongoose, { ClientSession } from "mongoose";

/**
 * Utility to run operations inside a MongoDB transaction when supported by the deployment
 * (e.g., Replica Set / Sharded Cluster), with a fallback for standalone MongoDB environments.
 */
export const runInTransaction = async <T>(
  fn: (session?: ClientSession) => Promise<T>
): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error: unknown) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // Fallback for standalone MongoDB test/development instances without replica sets
    if (
      errorMessage.includes("Transaction numbers are only allowed on a replica set member") ||
      errorMessage.includes("Standalone servers do not support transactions") ||
      errorMessage.includes("replica set")
    ) {
      return await fn(undefined);
    }

    throw error;
  } finally {
    session.endSession();
  }
};
