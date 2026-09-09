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

// Advisor Document Submission (v1)
router.post(
  '/',
  requireAdvisor,
  uploadDocumentFile.single('file'),
  validate(submitDocumentSchema),
  DocumentController.submit
);

// Officer Review Queue (filtered by status)
router.get(
  '/queue',
  requireOfficer,
  validate({ query: queueQuerySchema }),
  DocumentController.getQueue
);

// Advisor Document Resubmission (creates next version linked to original)
router.post(
  '/:id/resubmit',
  requireAdvisor,
  uploadDocumentFile.single('file'),
  validate({ params: documentIdParamSchema, body: resubmitDocumentSchema }),
  DocumentController.resubmit
);

// Officer Document Status Update (Approved, Needs Revision, Rejected)
router.patch(
  '/:id/status',
  requireOfficer,
  validate({ params: documentIdParamSchema, body: updateStatusSchema }),
  DocumentController.updateStatus
);

// Document Version History and Revision Thread
router.get(
  '/:id/versions',
  validate({ params: documentIdParamSchema }),
  DocumentController.getVersions
);

// List Documents (Role-scoped: Advisor sees own, Officer sees all)
router.get(
  '/',
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

// Single Document Detail
router.get(
  '/:id',
  validate({ params: documentIdParamSchema }),
  DocumentController.getById
);

export default router;

