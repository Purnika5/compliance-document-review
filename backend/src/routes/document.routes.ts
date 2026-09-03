import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateToken, requireAdvisor, requireOfficer } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  submitDocumentSchema,
  updateStatusSchema,
  documentQuerySchema,
  documentIdParamSchema
} from '../validations/document.validation';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  requireAdvisor,
  uploadDocumentFile.single('file'),
  validate(submitDocumentSchema),
  DocumentController.submit
);

router.patch(
  '/:id/status',
  requireOfficer,
  validate({ params: documentIdParamSchema, body: updateStatusSchema }),
  DocumentController.updateStatus
);

router.get(
  '/',
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

router.get(
  '/:id',
  validate({ params: documentIdParamSchema }),
  DocumentController.getById
);

export default router;
