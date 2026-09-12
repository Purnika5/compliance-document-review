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

const router = Router();

router.use(authenticateToken);

// Submit document
router.post(
  '/',
  requireAdvisor,
  uploadDocumentFile.single('file'),
  validate(submitDocumentSchema),
  DocumentController.submit
);

// Officer review queue
router.get(
  '/queue',
  requireOfficer,
  validate({ query: queueQuerySchema }),
  DocumentController.getQueue
);

// Resubmit revised document
router.post(
  '/:id/resubmit',
  requireAdvisor,
  uploadDocumentFile.single('file'),
  validate({ params: documentIdParamSchema, body: resubmitDocumentSchema }),
  DocumentController.resubmit
);

// Update review status
router.patch(
  '/:id/status',
  requireOfficer,
  validate({ params: documentIdParamSchema, body: updateStatusSchema }),
  DocumentController.updateStatus
);

// Get document version history
router.get(
  '/:id/versions',
  validate({ params: documentIdParamSchema }),
  DocumentController.getVersions
);

// List documents
router.get(
  '/',
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

// Get document analysis
router.get(
  '/:id/analysis',
  validate({ params: documentIdParamSchema }),
  DocumentController.getAnalysis
);

// Get single document detail
router.get(
  '/:id',
  validate({ params: documentIdParamSchema }),
  DocumentController.getById
);

export default router;

