import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { DocumentStatus } from '../types/models';
import { asyncHandler } from '../utils/asyncHandler';

export class DocumentController {
  public static submit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('A document file is required (PDF, DOCX, XLSX, TXT)', 400, 'FILE_REQUIRED');
    }

    const { title, description } = req.body;
    const document = await DocumentService.submitDocument({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      file: req.file,
      advisorId: req.user!.id
    });

    sendSuccess(res, document, 201, 'Document submitted successfully');
  });

  public static updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    const updatedDoc = await DocumentService.updateDocumentStatus(
      id,
      status as DocumentStatus
    );

    sendSuccess(res, updatedDoc, 200, `Document status updated to '${status}'`);
  });

  public static list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const documents = await DocumentService.listDocuments(req.user!, req.query);
    sendSuccess(res, documents, 200, 'Documents retrieved successfully');
  });

  public static getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const document = await DocumentService.getDocumentById(id, req.user!);
    sendSuccess(res, document, 200, 'Document retrieved successfully');
  });
}
