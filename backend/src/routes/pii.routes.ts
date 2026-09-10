import { Router } from 'express';
import { PiiController } from '../controllers/pii.controller';

const router = Router();

// Public / Internal gateway endpoint for PII masking
router.post('/mask', PiiController.mask);

export default router;
