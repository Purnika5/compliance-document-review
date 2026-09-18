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

// Get document version history
router.get(
  '/:id/versions',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.getVersions
);

// List advisor submissions alias
router.get(
  '/my-submissions',
  authenticateToken,
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

// List documents
router.get(
  '/',
  authenticateToken,
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

// Get document analysis
router.get(
  '/:id/analysis',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.getAnalysis
);

// Get single document detail
router.get(
  '/:id',
  authenticateToken,
  validate({ params: documentIdParamSchema }),
  DocumentController.getById
);

// Stream document file content (inline view / download)
router.get(
  '/:id/file',
  validate({ params: documentIdParamSchema }),
  DocumentController.downloadFile
);

export default router;

