import { Types } from "mongoose";
import { OrganizationRole } from "../constants/roles.js";
import {
  taskRepository,
  FindProjectTasksOptions,
} from "../repositories/task.repository.js";
import { projectRepository } from "../repositories/project.repository.js";
import { membershipRepository } from "../repositories/membership.repository.js";
import { activityLogRepository } from "../repositories/activity.repository.js";
import { notificationDispatcher } from "./notification-dispatcher.service.js";
import { realtimeEventPublisher } from "../realtime/socket.publisher.js";
import { authorizationService } from "./authorization.service.js";
import { searchService } from "./search.service.js";
import { AppError } from "../utils/AppError.js";
import { runInTransaction } from "../utils/transaction.js";
import {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
} from "../validators/task.schema.js";
import { ITaskDocument } from "../models/task.model.js";

export class TaskService {
  /**
   * Format clean DTO response for task with member roles included
   */
  private async formatTaskResponse(task: ITaskDocument) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const assignee = task.assignedTo as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const creator = task.createdBy as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = task.projectId as any;

    const orgMemberships = await membershipRepository.findMany({
      organizationId: task.organizationId,
      status: { $ne: "REMOVED" },
    });

    const userRoleMap = new Map<string, string>();
    orgMemberships.forEach((m) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mUser = m.userId as any;
      const uIdStr = mUser?._id ? mUser._id.toString() : m.userId?.toString() || "";
      if (uIdStr) {
        userRoleMap.set(uIdStr, m.role);
      }
    });

    const assigneeIdStr = assignee?._id ? assignee._id.toString() : task.assignedTo ? task.assignedTo.toString() : null;
    const creatorIdStr = creator?._id ? creator._id.toString() : task.createdBy.toString();

    return {
      id: task._id.toString(),
      organizationId: task.organizationId.toString(),
      projectId: project?._id ? project._id.toString() : task.projectId.toString(),
      project: project?._id
        ? {
            id: project._id.toString(),
            name: project.name,
            slug: project.slug,
          }
        : null,
      title: task.title,
      description: task.description || "",
      assignedTo: assignee?._id
        ? {
            id: assignee._id.toString(),
            name: assignee.name,
            email: assignee.email,
            role: userRoleMap.get(assignee._id.toString()) || "MEMBER",
            avatarUrl: assignee.avatarUrl || null,
          }
        : assigneeIdStr,
      createdBy: creator?._id
        ? {
            id: creator._id.toString(),
            name: creator.name,
            email: creator.email,
            role: userRoleMap.get(creator._id.toString()) || "MEMBER",
          }
        : creatorIdStr,
      status: task.status,
      priority: task.priority,
      labels: task.labels || [],
      dueDate: task.dueDate || null,
      position: task.position,
      completedAt: task.completedAt || null,
      deletedAt: task.deletedAt || null,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Creates a new task in a project with tenant, project access, and assignee membership verification.
   */
  public async createTask(
    organizationId: string,
    projectId: string,
    input: CreateTaskInput,
    actorUserId: string,
    actorRole?: OrganizationRole
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const projObjId = new Types.ObjectId(projectId);
    const actorObjId = new Types.ObjectId(actorUserId);

    // 1. Verify project exists in the organization
    const project = await projectRepository.getProjectById(
      projObjId,
      orgObjId
    );

    if (!project) {
      throw new AppError(
        "Project not found in this organization",
        404,
        "RESOURCE_NOT_FOUND"
      );
    }

    if (actorRole) {
      authorizationService.assertProjectAccess(project, actorUserId, actorRole);
    }

    // 2. Verify assignee active membership if supplied
    let assigneeObjId: Types.ObjectId | null = null;
    if (input.assignedTo) {
      if (actorRole === "MEMBER") {
        authorizationService.assertTaskAssignAccess(actorRole);
      }

      const activeAssignee = await membershipRepository.findActiveMembership(
        input.assignedTo,
        orgObjId
      );

      if (!activeAssignee) {
        throw new AppError(
          "Assignee must be an active member of the target organization",
          400,
          "VALIDATION_ERROR"
        );
      }

      if (!authorizationService.isProjectMember(project, input.assignedTo)) {
        throw new AppError(
          "Assignee must be an assigned member of this project",
          400,
          "VALIDATION_ERROR"
        );
      }

      assigneeObjId = new Types.ObjectId(input.assignedTo);
    }

    const taskStatus = input.status || "TODO";
    const completedAt = taskStatus === "DONE" ? new Date() : null;
    const taskPosition =
      input.position !== undefined && Number.isFinite(input.position)
        ? input.position
        : 1000;

    // 3. Atomic creation and activity log execution
    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      const tasks = await taskRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            projectId: projObjId,
            title: input.title,
            description: input.description || "",
            createdBy: actorObjId,
            assignedTo: assigneeObjId,
            status: taskStatus,
            priority: input.priority || "MEDIUM",
            labels: input.labels || [],
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            position: taskPosition,
            completedAt,
          },
        ],
        options
      );

      const createdTask = tasks[0];

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "TASK_CREATED",
            entityType: "Task",
            entityId: createdTask._id,
            metadata: {
              title: createdTask.title,
              projectId: projectId,
              assignedTo: input.assignedTo || null,
              status: createdTask.status,
              priority: createdTask.priority,
            },
          },
        ],
        options
      );

      const populatedTask = await taskRepository.getTaskById(
        createdTask._id,
        orgObjId
      );

      const formatted = await this.formatTaskResponse(populatedTask || createdTask);
      const result = { task: formatted };

      if (input.assignedTo) {
        await notificationDispatcher.dispatchTaskAssigned({
          organizationId,
          recipientId: input.assignedTo,
          taskId: createdTask._id.toString(),
          taskTitle: createdTask.title,
          actorUserId,
        });
      }

      realtimeEventPublisher.publishTaskEvent(
        "task:created",
        organizationId,
        projectId,
        createdTask._id.toString(),
        { task: result.task, actorId: actorUserId }
      );

      searchService.invalidateSearchCache(organizationId);

      return result;
    });
  }

  /**
   * Lists tasks for a project with filters, search, pagination, and sorting.
   */
  public async listProjectTasks(
    organizationId: string,
    projectId: string,
    options: FindProjectTasksOptions,
    actorUserId?: string,
    actorRole?: OrganizationRole
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const projObjId = new Types.ObjectId(projectId);

    // Verify project exists in target organization
    const project = await projectRepository.getProjectById(
      projObjId,
      orgObjId
    );

    if (!project) {
      throw new AppError(
        "Project not found in this organization",
        404,
        "RESOURCE_NOT_FOUND"
      );
    }

    if (actorUserId && actorRole) {
      authorizationService.assertProjectAccess(project, actorUserId, actorRole);
    }

    const { tasks, total, page, limit } =
      await taskRepository.findProjectTasksPaginated(
        projObjId,
        orgObjId,
        options
      );

    const formattedTasks = await Promise.all(tasks.map((t) => this.formatTaskResponse(t)));

    return {
      tasks: formattedTasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Gets specific task details by ID with tenant and project isolation.
   */
  public async getTaskDetails(
    organizationId: string,
    taskId: string,
    projectId?: string,
    actorUserId?: string,
    actorRole?: OrganizationRole
  ) {
    const orgObjId = new Types.ObjectId(organizationId);

    let task: ITaskDocument | null = null;
    if (projectId) {
      task = await taskRepository.getTaskByIdInProject(
        taskId,
        projectId,
        orgObjId
      );
    } else {
      task = await taskRepository.getTaskById(taskId, orgObjId);
    }

    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (actorUserId && actorRole) {
      const project = await projectRepository.getProjectById(
        task.projectId,
        orgObjId
      );
      if (project) {
        authorizationService.assertProjectAccess(project, actorUserId, actorRole);
      }
    }

    const formatted = await this.formatTaskResponse(task);

    return {
      task: formatted,
    };
  }

  /**
   * Updates task fields with tenant scoping, project authorization, and assignee validation.
   */
  public async updateTask(
    organizationId: string,
    taskId: string,
    input: UpdateTaskInput,
    actorUserId: string,
    actorRole?: OrganizationRole
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const task = await taskRepository.getTaskById(taskId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const project = await projectRepository.getProjectById(
      task.projectId,
      orgObjId
    );
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (actorRole) {
      authorizationService.assertProjectAccess(project, actorUserId, actorRole);
      authorizationService.assertTaskUpdateAccess(
        task,
        actorUserId,
        actorRole,
        input.assignedTo
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {};

    if (input.title !== undefined) updatePayload.title = input.title;
    if (input.description !== undefined) updatePayload.description = input.description;
    if (input.priority !== undefined) updatePayload.priority = input.priority;
    if (input.labels !== undefined) updatePayload.labels = input.labels;
    if (input.dueDate !== undefined) {
      updatePayload.dueDate = input.dueDate ? new Date(input.dueDate) : null;
    }

    if (input.position !== undefined) {
      if (!Number.isFinite(input.position)) {
        throw new AppError("Position must be a finite number", 400, "VALIDATION_ERROR");
      }
      updatePayload.position = input.position;
    }

    // Assignee validation if changed
    if (input.assignedTo !== undefined) {
      const prevAssigneeStr = task.assignedTo ? task.assignedTo.toString() : null;
      if (input.assignedTo !== prevAssigneeStr) {
        if (input.assignedTo) {
          const activeAssignee = await membershipRepository.findActiveMembership(
            input.assignedTo,
            orgObjId
          );

          if (!activeAssignee) {
            throw new AppError(
              "Assignee must be an active member of the target organization",
              400,
              "VALIDATION_ERROR"
            );
          }

          if (!authorizationService.isProjectMember(project, input.assignedTo)) {
            throw new AppError(
              "Assignee must be an assigned member of this project",
              400,
              "VALIDATION_ERROR"
            );
          }

          updatePayload.assignedTo = new Types.ObjectId(input.assignedTo);
        } else {
          updatePayload.assignedTo = null;
        }
      }
    }

    // Status transition & completedAt synchronization
    if (input.status !== undefined && input.status !== task.status) {
      updatePayload.status = input.status;
      if (input.status === "DONE") {
        updatePayload.completedAt = new Date();
      } else if (task.status === "DONE") {
        updatePayload.completedAt = null;
      }
    }

    const updatedTask = await taskRepository.updateTaskInOrg(
      taskId,
      orgObjId,
      updatePayload
    );

    if (!updatedTask) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    // Activity Logging
    let actionName = "TASK_UPDATED";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let activityMetadata: Record<string, any> = updatePayload;

    if (input.status !== undefined && input.status !== task.status) {
      actionName = "TASK_STATUS_CHANGED";
      activityMetadata = { previousStatus: task.status, newStatus: input.status };
    } else if (input.assignedTo !== undefined) {
      const prevAssigneeStr = task.assignedTo ? task.assignedTo.toString() : null;
      if (input.assignedTo !== prevAssigneeStr) {
        actionName = "TASK_ASSIGNED";
        activityMetadata = {
          previousAssigneeId: prevAssigneeStr,
          newAssigneeId: input.assignedTo,
        };
      }
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: actionName,
      entityType: "Task",
      entityId: updatedTask._id,
      metadata: activityMetadata,
    });

    const formattedTask = await this.formatTaskResponse(updatedTask);

    realtimeEventPublisher.publishTaskEvent(
      "task:updated",
      organizationId,
      updatedTask.projectId.toString(),
      taskId,
      { task: formattedTask, actorId: actorUserId }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      task: formattedTask,
    };
  }

  /**
   * Kanban position and status movement
   */
  public async moveTask(
    organizationId: string,
    taskId: string,
    input: MoveTaskInput,
    actorUserId: string,
    actorRole?: OrganizationRole
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    if (!Number.isFinite(input.position)) {
      throw new AppError("Position must be a finite number", 400, "VALIDATION_ERROR");
    }

    const task = await taskRepository.getTaskById(taskId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const project = await projectRepository.getProjectById(
      task.projectId,
      orgObjId
    );
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (actorRole) {
      authorizationService.assertProjectAccess(project, actorUserId, actorRole);
      authorizationService.assertTaskMoveAccess(task, actorUserId, actorRole);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {
      position: input.position,
    };

    if (input.status && input.status !== task.status) {
      updatePayload.status = input.status;
      if (input.status === "DONE") {
        updatePayload.completedAt = new Date();
      } else if (task.status === "DONE") {
        updatePayload.completedAt = null;
      }
    }

    const updatedTask = await taskRepository.updateTaskInOrg(
      taskId,
      orgObjId,
      updatePayload
    );

    if (!updatedTask) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: "TASK_MOVED",
      entityType: "Task",
      entityId: updatedTask._id,
      metadata: {
        previousStatus: task.status,
        newStatus: updatedTask.status,
        position: input.position,
      },
    });

    const formattedTask = await this.formatTaskResponse(updatedTask);

    realtimeEventPublisher.publishTaskEvent(
      "task:moved",
      organizationId,
      updatedTask.projectId.toString(),
      taskId,
      {
        task: formattedTask,
        previousStatus: task.status,
        newStatus: updatedTask.status,
        position: input.position,
        actorId: actorUserId,
      }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      task: formattedTask,
    };
  }

  /**
   * Assign or reassign task assignee (restricted to OWNER, ADMIN, MANAGER)
   */
  public async assignTask(
    organizationId: string,
    taskId: string,
    assignedTo: string | null,
    actorUserId: string,
    actorRole?: OrganizationRole
  ) {
    if (actorRole) {
      authorizationService.assertTaskAssignAccess(actorRole);
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const task = await taskRepository.getTaskById(taskId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const project = await projectRepository.getProjectById(
      task.projectId,
      orgObjId
    );
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }

    if (actorRole) {
      authorizationService.assertProjectAccess(project, actorUserId, actorRole);
    }

    let assigneeObjId: Types.ObjectId | null = null;
    if (assignedTo) {
      const activeAssignee = await membershipRepository.findActiveMembership(
        assignedTo,
        orgObjId
      );

      if (!activeAssignee) {
        throw new AppError(
          "Assignee must be an active member of the target organization",
          400,
          "VALIDATION_ERROR"
        );
      }

      if (!authorizationService.isProjectMember(project, assignedTo)) {
        throw new AppError(
          "Assignee must be an assigned member of this project",
          400,
          "VALIDATION_ERROR"
        );
      }

      assigneeObjId = new Types.ObjectId(assignedTo);
    }

    const prevAssigneeStr = task.assignedTo ? task.assignedTo.toString() : null;

    const updatedTask = await taskRepository.updateTaskInOrg(
      taskId,
      orgObjId,
      { assignedTo: assigneeObjId }
    );

    if (!updatedTask) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    await activityLogRepository.create({
      organizationId: orgObjId,
      actorId: actorObjId,
      action: assignedTo ? "TASK_ASSIGNED" : "TASK_UNASSIGNED",
      entityType: "Task",
      entityId: updatedTask._id,
      metadata: {
        previousAssigneeId: prevAssigneeStr,
        newAssigneeId: assignedTo,
      },
    });

    if (assignedTo) {
      await notificationDispatcher.dispatchTaskAssigned({
        organizationId,
        recipientId: assignedTo,
        taskId: updatedTask._id.toString(),
        taskTitle: updatedTask.title,
        actorUserId,
      });
    }

    const formattedTask = await this.formatTaskResponse(updatedTask);

    realtimeEventPublisher.publishTaskEvent(
      assignedTo ? "task:assigned" : "task:unassigned",
      organizationId,
      updatedTask.projectId.toString(),
      taskId,
      { task: formattedTask, assignedTo, actorId: actorUserId }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      task: formattedTask,
    };
  }

  /**
   * Soft delete task (deletedAt = now)
   */
  public async softDeleteTask(
    organizationId: string,
    taskId: string,
    actorUserId: string,
    actorRole?: OrganizationRole
  ) {
    if (actorRole) {
      authorizationService.assertTaskDeleteAccess(actorRole);
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const task = await taskRepository.getTaskById(taskId, orgObjId);
    if (!task) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const project = await projectRepository.getProjectById(
      task.projectId,
      orgObjId
    );
    if (project && actorRole) {
      authorizationService.assertProjectAccess(project, actorUserId, actorRole);
    }

    return await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      await taskRepository.softDeleteTask(taskId, orgObjId, options);

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "TASK_DELETED",
            entityType: "Task",
            entityId: task._id,
            metadata: { title: task.title },
          },
        ],
        options
      );

      const result = {
        message: "Task deleted successfully",
      };

      realtimeEventPublisher.publishTaskEvent(
        "task:deleted",
        organizationId,
        task.projectId.toString(),
        taskId,
        { taskId, actorId: actorUserId }
      );

      searchService.invalidateSearchCache(organizationId);

      return result;
    });
  }

  /**
   * Restore soft-deleted task (deletedAt = null)
   */
  public async restoreTask(
    organizationId: string,
    taskId: string,
    actorUserId: string,
    actorRole?: OrganizationRole
  ) {
    if (actorRole) {
      authorizationService.assertTaskDeleteAccess(actorRole);
    }

    const orgObjId = new Types.ObjectId(organizationId);
    const actorObjId = new Types.ObjectId(actorUserId);

    const restoredTask = await runInTransaction(async (session) => {
      const options = session ? { session } : {};

      const restored = await taskRepository.restoreTaskInOrg(
        taskId,
        orgObjId,
        options
      );

      if (!restored) {
        throw new AppError("Soft-deleted task not found", 404, "RESOURCE_NOT_FOUND");
      }

      await activityLogRepository["model"].create(
        [
          {
            organizationId: orgObjId,
            actorId: actorObjId,
            action: "TASK_RESTORED",
            entityType: "Task",
            entityId: restored._id,
            metadata: { title: restored.title },
          },
        ],
        options
      );

      return restored;
    });

    const formattedTask = await this.formatTaskResponse(restoredTask);

    realtimeEventPublisher.publishTaskEvent(
      "task:restored",
      organizationId,
      restoredTask.projectId.toString(),
      taskId,
      { task: formattedTask, actorId: actorUserId }
    );

    searchService.invalidateSearchCache(organizationId);

    return {
      message: "Task restored successfully",
      task: formattedTask,
    };
  }

  /**
   * Retrieves active tasks assigned to current user ("My Tasks")
   */
  public async getMyTasks(
    organizationId: string,
    userId: string,
    options: FindProjectTasksOptions
  ) {
    const orgObjId = new Types.ObjectId(organizationId);
    const userObjId = new Types.ObjectId(userId);

    const { tasks, total, page, limit } =
      await taskRepository.findMyTasksPaginated(
        userObjId,
        orgObjId,
        options
      );

    const formattedTasks = await Promise.all(tasks.map((t) => this.formatTaskResponse(t)));

    return {
      tasks: formattedTasks,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const taskService = new TaskService();
