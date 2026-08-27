import { Request, Response, NextFunction } from "express";
import { organizationService } from "../services/organization.service.js";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  transferOwnershipSchema,
} from "../validators/organization.schema.js";

export class OrganizationController {
  public createOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createOrganizationSchema.parse(req.body);
      const result = await organizationService.createOrganization(
        req.user!.id,
        input
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getUserOrganizations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await organizationService.getUserOrganizations(
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: result.organizations,
      });
    } catch (error) {
      next(error);
    }
  };

  public getOrganization = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = res.req.organization!.id;
      const result = await organizationService.getOrganizationDetails(
        organizationId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateOrganization = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = updateOrganizationSchema.parse(req.body);
      const organizationId = req.organization!.id;

      const result = await organizationService.updateOrganization(
        organizationId,
        input,
        req.user!.id
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public transferOwnership = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = transferOwnershipSchema.parse(req.body);
      const organizationId = req.organization!.id;

      const result = await organizationService.transferOwnership(
        organizationId,
        input.targetUserId,
        req.user!.id
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

export const organizationController = new OrganizationController();
