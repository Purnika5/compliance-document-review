import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DocumentService } from '../services/document.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { DocumentStatus } from '../types/models';

export const updateStatusSchema = z.object({
  status: z.enum(['Approved', 'Needs Revision', 'Rejected'], {
    errorMap: () => ({ message: "Status must be 'Approved', 'Needs Revision', or 'Rejected'" })
  })
});

export const documentQuerySchema = z.object({
  status: z.string().optional(),
  advisor_id: z.string().uuid().optional()
});

export class DocumentController {
  public static async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new AppError('A document file is required (PDF, DOCX, XLSX, TXT)', 400, 'FILE_REQUIRED');
      }

      const { title, description } = req.body;
      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        throw new AppError('Document title is required', 400, 'TITLE_REQUIRED');
      }

      const document = await DocumentService.submitDocument({
        title: title.trim(),
        description: description ? description.trim() : undefined,
        file: req.file,
        advisorId: req.user!.id
      });

      sendSuccess(res, document, 201, 'Document submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const validated = updateStatusSchema.parse(req.body);

      const updatedDoc = await DocumentService.updateDocumentStatus(
        id,
        validated.status as DocumentStatus
      );

      sendSuccess(res, updatedDoc, 200, `Document status updated to '${validated.status}'`);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedQuery = documentQuerySchema.parse(req.query);
      const documents = await DocumentService.listDocuments(req.user!, validatedQuery);
      sendSuccess(res, documents, 200, 'Documents retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const document = await DocumentService.getDocumentById(id, req.user!);
      sendSuccess(res, document, 200, 'Document retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
