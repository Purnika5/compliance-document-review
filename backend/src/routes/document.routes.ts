import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateToken, requireAdvisor, requireOfficer } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateStatusSchema, documentQuerySchema } from '../validations/document.validation';

const router = Router();

router.use(authenticateToken);

router.post(
  '/',
  requireAdvisor,
  uploadDocumentFile.single('file'),
  DocumentController.submit
);

router.patch(
  '/:id/status',
  requireOfficer,
  validate(updateStatusSchema),
  DocumentController.updateStatus
);

router.get(
  '/',
  validate({ query: documentQuerySchema }),
  DocumentController.list
);

router.get(
  '/:id',
  DocumentController.getById
);

export default router;
