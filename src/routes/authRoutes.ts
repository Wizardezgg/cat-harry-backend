import { Router } from 'express';
import {
  register,
  login,
  getMe,
  logout,
  googleAuth,
} from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Authentication Endpoints
router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);
router.post('/logout', logout);
router.post('/google', googleAuth);

export default router;
