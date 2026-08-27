import { Types } from "mongoose";
import { Project, IProject } from "../../models/project.model.js";

export class ProjectFactory {
  public static build(overrides: Partial<IProject> = {}): Partial<IProject> {
    const id = new Types.ObjectId().toString().slice(-6);
    const userId = new Types.ObjectId();
    return {
      organizationId: new Types.ObjectId(),
      name: `Test Project ${id}`,
      slug: `test-project-${id}`,
      description: "Sample test project description",
      ownerId: userId,
      createdBy: userId,
      status: "ACTIVE",
      ...overrides,
    };
  }

  public static async create(overrides: Partial<IProject> = {}): Promise<IProject> {
    const data = this.build(overrides);
    return await Project.create(data);
  }
}
