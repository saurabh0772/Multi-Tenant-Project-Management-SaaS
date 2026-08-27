import { Request, Response, NextFunction } from "express";
import { searchQuerySchema } from "../validators/search.schema.js";
import { searchService } from "../services/search.service.js";

export const searchController = {
  search: async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { organizationId } = req.params;
      const validatedParams = searchQuerySchema.parse(req.query);

      const result = await searchService.search(organizationId, validatedParams);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  },
};
