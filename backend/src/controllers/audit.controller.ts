import { Request, Response, NextFunction } from 'express';
import { AuditService } from '../services/audit.service';
import { sendSuccess } from '../utils/response';

export class AuditController {
  public static getAuditTrail = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const documentId = req.params.id;
      const history = await AuditService.getAuditTrail(documentId, req.user!);
      sendSuccess(res, history);
    } catch (err) {
      next(err);
    }
  };

  public static methodNotAllowed = (
    req: Request,
    res: Response
  ): void => {
    res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Audit trail records are strictly immutable and read-only.'
      }
    });
  };
}
