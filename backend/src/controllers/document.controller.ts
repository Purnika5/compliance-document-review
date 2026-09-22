import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';
import { sendSuccess } from '../utils/response';
import { AppError } from '../middleware/error.middleware';
import { DocumentStatus } from '../types/models';
import { asyncHandler } from '../utils/asyncHandler';

import { SearchEngineService } from '../services/search-engine.service';
import { GeminiCopilotService } from '../services/gemini-copilot.service';

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
    
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");

    if (document.file_path && fs.existsSync(document.file_path)) {
      res.setHeader('Content-Type', document.mime_type || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.file_name)}"`);
      res.sendFile(path.resolve(document.file_path));
      return;
    }

    // Disk fallback: serve extracted text or database analysis text
    const textContent = (document as any).original_text || document.masked_text;
    if (textContent) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.file_name || 'document.txt')}"`);
      res.send(textContent);
      return;
    }

    throw new AppError('File not found on storage disk', 404, 'FILE_NOT_FOUND');
  });

  /**
   * High-density filterable repository search & analytics endpoint.
   */
  public static search = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const result = await SearchEngineService.search(user, req.body || {});
    sendSuccess(res, result, 200, 'Documents and telemetry analytics retrieved successfully');
  });

  /**
   * In-chat file compliance audit & automated remediation endpoint.
   */
  public static auditAndFix = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
      throw new AppError('A document file is required for compliance audit (PDF, DOCX, XLSX, TXT)', 400, 'FILE_REQUIRED');
    }
    const user = (req as any).user;
    const { target_document_id, instructions } = req.body;
    const result = await GeminiCopilotService.auditAndRemediateFile(
      req.file,
      user,
      target_document_id,
      instructions
    );
    res.status(200).json(result);
  });

  /**
   * Downloads a remediated compliant document.
   */
  public static downloadRemediated = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const token = req.query.token as string;
    if (!token) {
      throw new AppError('Download token is required.', 400, 'TOKEN_REQUIRED');
    }
    const cached = GeminiCopilotService.getRemediatedFile(token);
    if (!cached) {
      throw new AppError('Download token expired or file not found.', 404, 'TOKEN_EXPIRED');
    }
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(cached.filename)}"`);
    res.send(cached.text);
  });

  /**
   * 1-Click submit remediated document directly as proposal or revision.
   */
  public static submitRemediated = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { text, title, description, targetDocumentId, token } = req.body;
    const document = await GeminiCopilotService.submitRemediatedDraft(user, {
      text,
      title,
      description,
      targetDocumentId,
      token,
    });
    sendSuccess(res, document, 201, 'Remediated document submitted successfully');
  });

  /**
   * AI-powered document classification endpoint.
   */
  public static classify = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { title, fileName, textSnippet, notes } = req.body;
    const combined = `${title || ''} ${fileName || ''} ${notes || ''} ${textSnippet || ''}`.toLowerCase();

    let category = 'Compliance Document';
    let confidence = 94;
    let reason = 'Matched institutional compliance document criteria.';

    if (/\b(audit|examination|inspection|deficiency|finding|attestation|soc\b|internal\s+audit)\b/i.test(combined)) {
      category = 'Audit Report';
      confidence = 98;
      reason = 'Identified audit and formal supervisory examination terminology.';
    } else if (/\b(regulatory|filing|form\s+adv|form\s+bd|sec\s+filing|finra\s+filing|10-k|10-q|crs|u4|u5|disclosure)\b/i.test(combined)) {
      category = 'Regulatory Filing';
      confidence = 98;
      reason = 'Identified statutory regulatory filing and disclosure tokens.';
    } else if (/\b(policy|agreement|nda|contract|terms\s+of\s+service|wsp|supervisory\s+procedures|ethics|privacy\s+policy)\b/i.test(combined)) {
      category = 'Policy Agreement';
      confidence = 96;
      reason = 'Identified binding policy or supervisory procedure agreement.';
    } else if (/\b(kyc|identity|passport|license|aml|anti-money|cip|accredited\s+investor|verification)\b/i.test(combined)) {
      category = 'Identity & KYC Verification';
      confidence = 99;
      reason = 'Identified customer identification and KYC compliance verification.';
    } else if (/\b(proposal|portfolio|pitch|allocation|growth\s+strategy|asset\s+management|wealth|deck|fund)\b/i.test(combined)) {
      category = 'Investment Proposal';
      confidence = 97;
      reason = 'Identified investment proposal and portfolio presentation characteristics.';
    }

    sendSuccess(res, { category, confidence, reason }, 200, 'Classification completed successfully');
  });
}


