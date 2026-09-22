import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateToken, requireAdvisor, requireOfficer } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  submitDocumentSchema,
  updateStatusSchema,
  documentQuerySchema,
  documentIdParamSchema,
  queueQuerySchema,
  resubmitDocumentSchema
} from '../validations/document.validation';
import { AuditController } from '../controllers/audit.controller';

const router = Router();

// Audit trail history endpoint (strictly read-only)
router.get(
  '/:id/audit-trail',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  AuditController.getAuditTrail
);
router.all('/:id/audit-trail', AuditController.methodNotAllowed);

// Submit document
router.post(
  '/',
  uploadDocumentFile.single('file'),
  authenticateToken,
  requireAdvisor,
  validate(submitDocumentSchema),
  DocumentController.submit
);

// Officer review queue
router.get(
  '/queue',
  authenticateToken,
  requireOfficer,
  validate({ query: queueQuerySchema }),
  DocumentController.getQueue
);

// Resubmit revised document
router.post(
  '/:id/resubmit',
  uploadDocumentFile.single('file'),
  authenticateToken,
  requireAdvisor,
  validate({ params: documentIdParamSchema, body: resubmitDocumentSchema }),
  DocumentController.resubmit
);

// Update review status
router.patch(
  '/:id/status',
  authenticateToken,
  requireOfficer,
  validate({ params: documentIdParamSchema, body: updateStatusSchema }),
  DocumentController.updateStatus
);

// List advisor submissions alias
router.get(
  '/my-submissions',
  authenticateToken,
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

// High-density filterable repository search & analytics endpoint
router.post(
  '/search',
  authenticateToken,
  DocumentController.search
);

// In-chat file compliance audit & automated remediation endpoint
router.post(
  '/audit-and-fix',
  authenticateToken,
  uploadDocumentFile.single('file'),
  DocumentController.auditAndFix
);

// Download compliant remediated document (public token authentication)
router.get(
  '/download-remediated',
  DocumentController.downloadRemediated
);

// 1-Click submit remediated document
router.post(
  '/submit-remediated',
  authenticateToken,
  DocumentController.submitRemediated
);

// AI Document Category Classification
router.post(
  '/classify',
  authenticateToken,
  DocumentController.classify
);

// List documents
router.get(
  '/',
  authenticateToken,
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

// Get document version history
router.get(
  '/:id/versions',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.getVersions
);

// Get document analysis
router.get(
  '/:id/analysis',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.getAnalysis
);

// Stream document file content (inline view / download)
router.get(
  '/:id/file',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.downloadFile
);

// Get single document detail (MUST BE LAST GET ROUTE WITH :id)
router.get(
  '/:id',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.getById
);

export default router;

