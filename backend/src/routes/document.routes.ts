import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { authenticateToken, requireAdvisor, requireOfficer } from '../middleware/auth.middleware';
import { uploadDocumentFile } from '../middleware/upload.middleware';

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
  DocumentController.updateStatus
);

router.get(
  '/',
  DocumentController.list
);

router.get(
  '/:id',
  DocumentController.getById
);

export default router;
