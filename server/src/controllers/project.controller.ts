import { Request, Response, NextFunction } from "express";
import { projectService } from "../services/project.service.js";
import {
  createProjectSchema,
  updateProjectSchema,
  projectQuerySchema,
} from "../validators/project.schema.js";

export class ProjectController {
  public createProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createProjectSchema.parse(req.body);
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;

      const result = await projectService.createProject(
        organizationId,
        input,
        req.user!.id,
        actorRole
      );

      res.status(201).json({
        success: true,
        data: result.project,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProjects = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;
      const queryParams = projectQuerySchema.parse(req.query);

      const options = {
        page: queryParams.page ? parseInt(queryParams.page, 10) : undefined,
        limit: queryParams.limit ? parseInt(queryParams.limit, 10) : undefined,
        status: queryParams.status,
        ownerId: queryParams.ownerId,
        search: queryParams.search,
        sortBy: queryParams.sortBy,
        sortOrder: queryParams.sortOrder,
      };

      const result = await projectService.listProjects(
        organizationId,
        options,
        req.user!.id,
        actorRole
      );

      res.status(200).json({
        success: true,
        data: result.projects,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;
      const { projectId } = req.params;

      const result = await projectService.getProjectDetails(
        organizationId,
        projectId,
        req.user!.id,
        actorRole
      );

      res.status(200).json({
        success: true,
        data: result.project,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;
      const { projectId } = req.params;
      const input = updateProjectSchema.parse(req.body);

      const result = await projectService.updateProject(
        organizationId,
        projectId,
        input,
        req.user!.id,
        actorRole
      );

      res.status(200).json({
        success: true,
        data: result.project,
      });
    } catch (error) {
      next(error);
    }
  };

  public archiveProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;
      const { projectId } = req.params;

      const result = await projectService.archiveProject(
        organizationId,
        projectId,
        req.user!.id,
        actorRole
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public restoreProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;
      const { projectId } = req.params;

      const result = await projectService.restoreProject(
        organizationId,
        projectId,
        req.user!.id,
        actorRole
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public deleteProject = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const actorRole = req.organization!.role;
      const { projectId } = req.params;

      const result = await projectService.deleteProject(
        organizationId,
        projectId,
        req.user!.id,
        actorRole
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}

export const projectController = new ProjectController();
