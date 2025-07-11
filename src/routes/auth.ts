import { Router } from 'express';
import { UserRepository } from '../repositories/UserRepository';
import { generateToken } from '../middleware/auth';
import {
  LoginRequest,
  RegisterRequest,
  ApiResponse,
  AuthResponse,
} from '../types';
import { z } from 'zod';

const router = Router();
const userRepo = new UserRepository();

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6),
});

const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
        message: validation.error.errors.map((e) => e.message).join(', '),
      } as ApiResponse);
      return;
    }

    const { username, email, password } = validation.data;

    // Check if user already exists
    const existingUser = await userRepo.findByUsername(username);
    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'Username already exists',
      } as ApiResponse);
      return;
    }

    // Create new user
    const user = await userRepo.createUser(username, email, password);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      data: {
        token,
        user,
      },
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid input data',
      } as ApiResponse);
      return;
    }

    const { username, password } = validation.data;

    // Verify credentials
    const user = await userRepo.verifyPassword(username, password);
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      } as ApiResponse);
      return;
    }

    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user,
      },
    } as ApiResponse<AuthResponse>);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
