import { Request, Response, NextFunction } from "express";
import { taskService } from "../services/task.service.js";
import {
  createTaskSchema,
  updateTaskSchema,
  moveTaskSchema,
  assignTaskSchema,
  taskQuerySchema,
} from "../validators/task.schema.js";

export class TaskController {
  public createTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createTaskSchema.parse(req.body);
      const organizationId = req.organization!.id;
      const { projectId } = req.params;

      const result = await taskService.createTask(
        organizationId,
        projectId,
        input,
        req.user!.id,
        req.organization!.role
      );

      res.status(201).json({
        success: true,
        data: result.task,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProjectTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { projectId } = req.params;
      const queryParams = taskQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        status: queryParams.status,
        priority: queryParams.priority,
        assignedTo: queryParams.assignedTo,
        dueDate: queryParams.dueDate,
        search: queryParams.search,
        sortBy: queryParams.sortBy,
        sortOrder: queryParams.sortOrder,
      };

      const result = await taskService.listProjectTasks(
        organizationId,
        projectId,
        options,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId, projectId } = req.params;

      const result = await taskService.getTaskDetails(
        organizationId,
        taskId,
        projectId,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result.task,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;
      const input = updateTaskSchema.parse(req.body);

      const result = await taskService.updateTask(
        organizationId,
        taskId,
        input,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result.task,
      });
    } catch (error) {
      next(error);
    }
  };

  public moveTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;
      const input = moveTaskSchema.parse(req.body);

      const result = await taskService.moveTask(
        organizationId,
        taskId,
        input,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result.task,
      });
    } catch (error) {
      next(error);
    }
  };

  public assignTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;
      const input = assignTaskSchema.parse(req.body);

      const result = await taskService.assignTask(
        organizationId,
        taskId,
        input.assignedTo,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result.task,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;

      const result = await taskService.softDeleteTask(
        organizationId,
        taskId,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public restoreTask = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { taskId } = req.params;

      const result = await taskService.restoreTask(
        organizationId,
        taskId,
        req.user!.id,
        req.organization!.role
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMyTasks = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const queryParams = taskQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        status: queryParams.status,
        priority: queryParams.priority,
        search: queryParams.search,
        sortBy: queryParams.sortBy,
        sortOrder: queryParams.sortOrder,
      };

      const result = await taskService.getMyTasks(
        organizationId,
        req.user!.id,
        options
      );

      res.status(200).json({
        success: true,
        data: result.tasks,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const taskController = new TaskController();
