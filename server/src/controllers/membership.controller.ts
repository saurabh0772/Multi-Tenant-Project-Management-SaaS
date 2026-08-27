import { Request, Response, NextFunction } from "express";
import { membershipService } from "../services/membership.service.js";
import {
  updateMemberRoleSchema,
  updateMemberStatusSchema,
} from "../validators/membership.schema.js";

export class MembershipController {
  public getMembers = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const options = {
        role: req.query.role as string | undefined,
        status: req.query.status as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await membershipService.getOrgMembers(
        organizationId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.members,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public getMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { memberId } = req.params;

      const result = await membershipService.getMemberDetails(
        organizationId,
        memberId
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public updateMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { memberId } = req.params;
      const actor = {
        userId: req.user!.id,
        role: req.organization!.role,
      };

      // Independent authorization for role vs status
      let result;
      if (req.body.role !== undefined) {
        const roleInput = updateMemberRoleSchema.parse({ role: req.body.role });
        result = await membershipService.updateMemberRole(
          organizationId,
          memberId,
          roleInput.role,
          actor
        );
      } else if (req.body.status !== undefined) {
        const statusInput = updateMemberStatusSchema.parse({
          status: req.body.status,
        });
        result = await membershipService.updateMemberStatus(
          organizationId,
          memberId,
          statusInput.status,
          actor
        );
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Must provide either role or status to update",
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public removeMember = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { memberId } = req.params;
      const actor = {
        userId: req.user!.id,
        role: req.organization!.role,
      };

      const result = await membershipService.removeMember(
        organizationId,
        memberId,
        actor
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

export const membershipController = new MembershipController();
