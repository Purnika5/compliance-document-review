import { Request, Response } from 'express';
import { PiiService } from '../services/pii.service';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

export class PiiController {
  public static mask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = PiiService.maskDocument(req.body);
    sendSuccess(res, result, 200, 'Text sanitized and PII masked successfully');
  });
}
