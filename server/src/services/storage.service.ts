import fs from "fs";
import path from "path";
import { AppError } from "../utils/AppError.js";

export interface IStorageProvider {
  saveFile(relativeKey: string, buffer: Buffer): Promise<void>;
  deleteFile(relativeKey: string): Promise<void>;
  getFileStream(relativeKey: string): fs.ReadStream;
  fileExists(relativeKey: string): Promise<boolean>;
  getAbsoluteFilePath(relativeKey: string): string;
}

export class LocalStorageProvider implements IStorageProvider {
  private readonly uploadsRootDir: string;

  constructor(uploadsDir?: string) {
    this.uploadsRootDir = uploadsDir || path.resolve(process.cwd(), "uploads");
  }

  public getAbsoluteFilePath(relativeKey: string): string {
    const absolutePath = path.resolve(this.uploadsRootDir, relativeKey);
    if (!absolutePath.startsWith(this.uploadsRootDir)) {
      throw new AppError("Invalid file storage path: Path traversal detected", 400, "VALIDATION_ERROR");
    }
    return absolutePath;
  }

  public async saveFile(relativeKey: string, buffer: Buffer): Promise<void> {
    const absolutePath = this.getAbsoluteFilePath(relativeKey);
    const targetDir = path.dirname(absolutePath);
    await fs.promises.mkdir(targetDir, { recursive: true });
    await fs.promises.writeFile(absolutePath, buffer);
  }

  public async deleteFile(relativeKey: string): Promise<void> {
    const absolutePath = this.getAbsoluteFilePath(relativeKey);
    await fs.promises.unlink(absolutePath).catch(() => {});
  }

  public getFileStream(relativeKey: string): fs.ReadStream {
    const absolutePath = this.getAbsoluteFilePath(relativeKey);
    if (!fs.existsSync(absolutePath)) {
      throw new AppError("File not found on storage provider", 404, "RESOURCE_NOT_FOUND");
    }
    return fs.createReadStream(absolutePath);
  }

  public async fileExists(relativeKey: string): Promise<boolean> {
    try {
      const absolutePath = this.getAbsoluteFilePath(relativeKey);
      await fs.promises.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }
}

export class StorageService implements IStorageProvider {
  private provider: IStorageProvider;

  constructor(provider?: IStorageProvider) {
    this.provider = provider || new LocalStorageProvider();
  }

  public setProvider(provider: IStorageProvider) {
    this.provider = provider;
  }

  public getAbsoluteFilePath(relativeKey: string): string {
    return this.provider.getAbsoluteFilePath(relativeKey);
  }

  public async saveFile(relativeKey: string, buffer: Buffer): Promise<void> {
    return this.provider.saveFile(relativeKey, buffer);
  }

  public async deleteFile(relativeKey: string): Promise<void> {
    return this.provider.deleteFile(relativeKey);
  }

  public getFileStream(relativeKey: string): fs.ReadStream {
    return this.provider.getFileStream(relativeKey);
  }

  public async fileExists(relativeKey: string): Promise<boolean> {
    return this.provider.fileExists(relativeKey);
  }
}

export const storageService = new StorageService();
