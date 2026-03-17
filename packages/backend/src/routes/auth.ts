import { Router, Response } from 'express';
import { logger } from '../services/logger.js';
import { authService } from '../services/authService.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import {
  validate,
  registerSchema,
  registerStudentSchema,
  registerParentSchema,
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createStudentByParentSchema,
  googleAuthSchema,
  updateProfileSchema
} from '../middleware/validate.js';
import { verifyTurnstile } from '../middleware/turnstile.js';
import { checkBruteForce, recordFailedLogin, recordSuccessfulLogin } from '../middleware/bruteForce.js';
import type {
  AuthRequest,
  RegisterRequest,
  LoginRequest,
  RegisterStudentRequest,
  RegisterParentRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  CreateStudentByParentRequest,
  GoogleAuthRequest,
  UpdateProfileRequest
} from '../types/index.js';

const router = Router();

const REFRESH_TOKEN_COOKIE = 'vocab_refresh_token';
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_TOKEN_MAX_AGE,
    path: '/api/auth',
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
  });
}

// POST /api/auth/register (legacy - creates student)
router.post('/register', verifyTurnstile, validate(registerSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, displayName } = req.body as RegisterRequest;
    const result = await authService.register(username, password, displayName);

    setRefreshTokenCookie(res, result.tokens.refreshToken);
    res.status(201).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// POST /api/auth/register/student - Student registration (no email)
router.post('/register/student', verifyTurnstile, validate(registerStudentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, displayName } = req.body as RegisterStudentRequest;
    const result = await authService.registerStudent(username, password, displayName);

    setRefreshTokenCookie(res, result.tokens.refreshToken);
    res.status(201).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// POST /api/auth/register/parent - Parent registration (email required)
router.post('/register/parent', verifyTurnstile, validate(registerParentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email, displayName } = req.body as RegisterParentRequest;
    const result = await authService.registerParent(username, password, email, displayName);

    setRefreshTokenCookie(res, result.tokens.refreshToken);
    res.status(201).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';

    if (message === 'Username already taken' || message === 'Email already registered') {
      res.status(409).json({ error: 'Conflict', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', validate(forgotPasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { email } = req.body as ForgotPasswordRequest;

    // Always succeed to prevent email enumeration
    await authService.requestPasswordReset(email);

    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  } catch (error) {
    // Log but don't expose errors
    logger.error('Password reset error', { error: String(error) });
    res.json({
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', validate(resetPasswordSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { token, password } = req.body as ResetPasswordRequest;
    await authService.resetPassword(token, password);

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Password reset failed';
    res.status(400).json({ error: 'Bad Request', message });
  }
});

// GET /api/auth/validate-reset-token/:token - Check if token is valid
router.get('/validate-reset-token/:token', async (req: AuthRequest, res: Response) => {
  try {
    const token = req.params.token as string;
    const isValid = await authService.validateResetToken(token);

    res.json({ valid: isValid });
  } catch {
    res.json({ valid: false });
  }
});

// POST /api/auth/login
router.post('/login', checkBruteForce, verifyTurnstile, validate(loginSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body as LoginRequest;
    const result = await authService.login(username, password);

    recordSuccessfulLogin(username);
    setRefreshTokenCookie(res, result.tokens.refreshToken);
    res.json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken }
    });
  } catch (error) {
    const { username } = req.body as LoginRequest;
    if (username) {
      recordFailedLogin(username);
    }
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: AuthRequest, res: Response) => {
  try {
    // Read from cookie first, fall back to body (mobile clients)
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    if (refreshToken) {
      authService.logout(refreshToken);
    }

    clearRefreshTokenCookie(res);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Logout failed'
    });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: AuthRequest, res: Response) => {
  try {
    // Read from cookie first, fall back to body (mobile clients)
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Unauthorized', message: 'Refresh token is required' });
      return;
    }

    const tokens = await authService.refresh(refreshToken);

    setRefreshTokenCookie(res, tokens.refreshToken);
    res.json({ tokens: { accessToken: tokens.accessToken } });
  } catch (error) {
    clearRefreshTokenCookie(res);
    res.status(401).json({
      error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Token refresh failed'
    });
  }
});

// POST /api/auth/google - Google OAuth login/register for parents
router.post('/google', validate(googleAuthSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { token, tokenType, username, confirmLink } = req.body as GoogleAuthRequest & { confirmLink?: boolean };
    const result = await authService.googleAuth(token, tokenType, username, confirmLink);

    // Account linking requires explicit user consent
    if ('linkPending' in result && result.linkPending) {
      res.status(200).json({
        linkPending: true,
        email: result.email,
        message: 'An account with this email already exists. Please confirm to link your Google account.'
      });
      return;
    }

    setRefreshTokenCookie(res, result.tokens.refreshToken);
    res.status(result.isNewUser ? 201 : 200).json({
      user: result.user,
      tokens: { accessToken: result.tokens.accessToken },
      isNewUser: result.isNewUser
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google authentication failed';

    if (message === 'Google OAuth is not configured') {
      res.status(503).json({ error: 'Service Unavailable', message });
    } else if (message === 'Google sign-in is only available for parent accounts') {
      res.status(403).json({ error: 'Forbidden', message });
    } else {
      res.status(401).json({ error: 'Unauthorized', message });
    }
  }
});

// POST /api/auth/create-student - Parent creates a student account (auto-linked)
router.post('/create-student', authMiddleware, requireRole(['parent']), validate(createStudentByParentSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, displayName } = req.body as CreateStudentByParentRequest;
    const result = await authService.createStudentForParent(req.user!.userId, username, password, displayName);

    res.status(201).json({
      success: true,
      user: result.user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create student';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else if (message === 'Only parents can create student accounts') {
      res.status(403).json({ error: 'Forbidden', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// PATCH /api/auth/profile - Self-service profile update
router.patch('/profile', authMiddleware, validate(updateProfileSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { username, displayName } = req.body as UpdateProfileRequest;
    const user = authService.updateProfile(req.user!.userId, { username, displayName });

    res.json({ user });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Profile update failed';

    if (message === 'Username already taken') {
      res.status(409).json({ error: 'Conflict', message });
    } else if (message === 'User not found') {
      res.status(404).json({ error: 'Not Found', message });
    } else {
      res.status(400).json({ error: 'Bad Request', message });
    }
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const user = authService.getUser(req.user!.userId);

    if (!user) {
      res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
      return;
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
});

export default router;
