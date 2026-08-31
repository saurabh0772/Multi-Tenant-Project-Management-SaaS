import { Request, Response, NextFunction } from "express";
import { invitationService } from "../services/invitation.service.js";
import { createInvitationSchema } from "../validators/invitation.schema.js";

export class InvitationController {
  public sendInvitation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input = createInvitationSchema.parse(req.body);
      const organizationId = req.organization!.id;

      const result = await invitationService.sendInvitation(
        organizationId,
        input,
        req.user!.id,
        req.organization!.role
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public getInvitations = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const options = {
        status: req.query.status as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await invitationService.getOrgInvitations(
        organizationId,
        options
      );

      res.status(200).json({
        success: true,
        data: result.invitations,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  public revokeInvitation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const organizationId = req.organization!.id;
      const { invitationId } = req.params;

      const result = await invitationService.revokeInvitation(
        organizationId,
        invitationId,
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

  public getInvitationDetails = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.params;
      const result = await invitationService.getInvitationDetails(token);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public acceptInvitation = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { token } = req.params;
      const authenticatedUserId = req.user!.id;

      const result = await invitationService.acceptInvitation(
        token,
        authenticatedUserId
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

export const invitationController = new InvitationController();
