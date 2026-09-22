import fs from 'fs';
import path from 'path';
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

    if (req.file.size === 0) {
      throw new AppError('The uploaded file cannot be empty', 400, 'FILE_EMPTY');
    }

    const { title, description } = req.body;
    const document = await DocumentService.submitDocument({
      title: title.trim(),
      description: description ? description.trim() : undefined,
      file: req.file,
      advisorId: (req as any).user.id
    });

    sendSuccess(res, document, 201, 'Document submitted successfully');
  });

  public static updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status, comment } = req.body;

    const updatedDoc = await DocumentService.updateDocumentStatus(
      id,
      status as DocumentStatus,
      comment,
      (req as any).user.id
    );

    sendSuccess(res, updatedDoc, 200, `Document status updated to '${status}'`);
  });

  public static getQueue = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { status } = req.query;
    const queue = await DocumentService.getQueue({ status: status as string });
    sendSuccess(res, queue, 200, 'Officer review queue retrieved successfully');
  });

  public static resubmit = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('A revised document file is required (PDF, DOCX, XLSX, TXT)', 400, 'FILE_REQUIRED');
    }

    if (req.file.size === 0) {
      throw new AppError('The uploaded file cannot be empty', 400, 'FILE_EMPTY');
    }

    const { id } = req.params;
    const { title, description, notes } = req.body;

    const document = await DocumentService.resubmitDocument(
      id,
      {
        file: req.file,
        title: title ? title.trim() : undefined,
        description: description ? description.trim() : undefined,
        notes: notes ? notes.trim() : undefined
      },
      (req as any).user
    );

    sendSuccess(res, document, 201, 'Document resubmitted successfully as a new version');
  });

  public static getVersions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const lineage = await DocumentService.getDocumentVersions(id, (req as any).user);
    sendSuccess(res, lineage, 200, 'Document version history retrieved successfully');
  });

  public static list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const documents = await DocumentService.listDocuments((req as any).user, req.query);
    sendSuccess(res, documents, 200, 'Documents retrieved successfully');
  });

  public static getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const document = await DocumentService.getDocumentById(id, (req as any).user);
    sendSuccess(res, document, 200, 'Document retrieved successfully');
  });

  public static getAnalysis = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const analysis = await DocumentService.getDocumentAnalysis(id, (req as any).user);
    sendSuccess(res, analysis, 200, 'Document analysis retrieved successfully');
  });

  public static downloadFile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const user = (req as any).user || { id: 'public-access', role: 'Officer', email: '', name: 'Officer' };
    const document = await DocumentService.getDocumentById(id, user as any);
    if (!fs.existsSync(document.file_path)) {
      throw new AppError('File not found on storage disk', 404, 'FILE_NOT_FOUND');
    }
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
    res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.file_name)}"`);
    res.sendFile(path.resolve(document.file_path));
  });
}

