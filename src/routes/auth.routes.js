import { Router } from 'express';
import {
  register,
  login,
  validateRegister,
  validateLogin,
} from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

export default router;
