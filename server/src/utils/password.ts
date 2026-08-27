import argon2 from "argon2";

/**
 * Hashes a plaintext password using Argon2id
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3, // 3 iterations
    parallelism: 4, // 4 threads
  });
};

/**
 * Verifies a plaintext password against an Argon2id password hash
 */
export const verifyPassword = async (
  password: string,
  passwordHash?: string | null
): Promise<boolean> => {
  try {
    if (!passwordHash || typeof passwordHash !== "string") {
      return false;
    }
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
};
