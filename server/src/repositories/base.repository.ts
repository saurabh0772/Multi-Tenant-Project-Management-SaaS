import { Model, Document, FilterQuery, UpdateQuery, QueryOptions, Types } from "mongoose";
import { handleDatabaseError } from "../utils/dbError.js";

export abstract class BaseRepository<T extends Document> {
  protected constructor(protected readonly model: Model<T>) {}

  public async findById(
    id: Types.ObjectId | string,
    select?: string,
    options?: QueryOptions
  ): Promise<T | null> {
    try {
      const query = this.model.findById(id, undefined, options);
      if (select) {
        query.select(select);
      }
      return await query.exec();
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async findOne(
    filter: FilterQuery<T>,
    select?: string,
    options?: QueryOptions
  ): Promise<T | null> {
    try {
      const query = this.model.findOne(filter, undefined, options);
      if (select) {
        query.select(select);
      }
      return await query.exec();
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async findMany(
    filter: FilterQuery<T> = {},
    select?: string,
    options?: QueryOptions
  ): Promise<T[]> {
    try {
      const query = this.model.find(filter, undefined, options);
      if (select) {
        query.select(select);
      }
      return await query.exec();
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async create(doc: Partial<T>): Promise<T> {
    try {
      return await this.model.create(doc);
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async update(
    filter: FilterQuery<T>,
    updateData: UpdateQuery<T>,
    options: QueryOptions = { new: true, runValidators: true }
  ): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate(filter, updateData, options).exec();
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async delete(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const result = await this.model.deleteOne(filter).exec();
      return result.deletedCount > 0;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async count(filter: FilterQuery<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter).exec();
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }

  public async exists(filter: FilterQuery<T>): Promise<boolean> {
    try {
      const doc = await this.model.exists(filter).exec();
      return doc !== null;
    } catch (error) {
      throw handleDatabaseError(error);
    }
  }
}
