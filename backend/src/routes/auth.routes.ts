import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { signupSchema, loginSchema } from '../validations/auth.validation';

const router = Router();

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.getCurrentUser);

export default router;
