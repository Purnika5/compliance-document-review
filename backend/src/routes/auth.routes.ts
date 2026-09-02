import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/signup', AuthController.signup);
router.post('/login', AuthController.login);
router.get('/me', authenticateToken, AuthController.getCurrentUser);

export default router;
