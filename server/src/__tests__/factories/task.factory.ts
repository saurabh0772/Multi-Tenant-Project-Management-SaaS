import { Types } from "mongoose";
import { Task, ITask } from "../../models/task.model.js";

export class TaskFactory {
  public static build(overrides: Partial<ITask> = {}): Partial<ITask> {
    const id = new Types.ObjectId().toString().slice(-6);
    return {
      organizationId: new Types.ObjectId(),
      projectId: new Types.ObjectId(),
      title: `Test Task ${id}`,
      description: "Sample test task description",
      createdBy: new Types.ObjectId(),
      status: "TODO",
      priority: "MEDIUM",
      labels: ["backend"],
      position: 1000,
      deletedAt: null,
      ...overrides,
    };
  }

  public static async create(overrides: Partial<ITask> = {}): Promise<ITask> {
    const data = this.build(overrides);
    return await Task.create(data);
  }
}
