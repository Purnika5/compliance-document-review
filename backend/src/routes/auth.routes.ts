import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { signupSchema, loginSchema, updateProfileSchema } from '../validations/auth.validation';

const router = Router();

router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/login', validate(loginSchema), AuthController.login);
router.get('/me', authenticateToken, AuthController.getCurrentUser);
router.put('/profile', authenticateToken, validate(updateProfileSchema), AuthController.updateProfile);
router.patch('/profile', authenticateToken, validate(updateProfileSchema), AuthController.updateProfile);

export default router;
