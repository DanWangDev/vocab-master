import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        });
        return;
      }
      next(error);
    }
  };
}

// Validation schemas
export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  displayName: z.string()
    .min(1)
    .max(50)
    .optional(),
  turnstileToken: z.string().optional()
});

// Student registration - same as base register (no email)
export const registerStudentSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  displayName: z.string()
    .min(1)
    .max(50)
    .optional(),
  turnstileToken: z.string().optional()
});

// Parent registration - requires email
export const registerParentSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be at most 255 characters'),
  displayName: z.string()
    .min(1)
    .max(50)
    .optional(),
  turnstileToken: z.string().optional()
});

// Forgot password - just email
export const forgotPasswordSchema = z.object({
  email: z.string()
    .email('Invalid email address')
});

// Reset password - token and new password
export const resetPasswordSchema = z.object({
  token: z.string()
    .min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
});

// Admin/Parent reset user password
export const resetUserPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters')
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  turnstileToken: z.string().optional()
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

export const updateSettingsSchema = z.object({
  soundEnabled: z.boolean().optional(),
  autoAdvance: z.boolean().optional(),
  language: z.enum(['en', 'zh-CN']).optional()
}).refine(data => data.soundEnabled !== undefined || data.autoAdvance !== undefined || data.language !== undefined, {
  message: 'At least one setting must be provided'
});

export const updateStatsSchema = z.object({
  totalWordsStudied: z.number().int().min(0).optional(),
  quizzesTaken: z.number().int().min(0).optional(),
  challengesCompleted: z.number().int().min(0).optional(),
  bestChallengeScore: z.number().int().min(0).optional(),
  lastStudyDate: z.string().nullable().optional()
});

export const completeChallengeSchema = z.object({
  score: z.number().int().min(0).max(10000, 'Score cannot exceed 10000')
});

export const importDataSchema = z.object({
  settings: z.object({
    soundEnabled: z.boolean(),
    autoAdvance: z.boolean(),
    language: z.enum(['en', 'zh-CN']).optional()
  }).optional(),
  stats: z.object({
    totalWordsStudied: z.number().int().min(0),
    quizzesTaken: z.number().int().min(0),
    challengesCompleted: z.number().int().min(0),
    bestChallengeScore: z.number().int().min(0),
    lastStudyDate: z.string().nullable()
  }).optional()
});

// Google OAuth
export const googleAuthSchema = z.object({
  token: z.string().min(1, 'Google token is required'),
  tokenType: z.enum(['id_token', 'access_token']).default('id_token'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  confirmLink: z.boolean().optional()
});

// Parent creates student account
export const createStudentByParentSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  displayName: z.string()
    .min(1)
    .max(50)
    .optional()
});

// Link request schemas
export const createLinkRequestSchema = z.object({
  studentId: z.number().int().positive('Student ID is required'),
  message: z.string().max(500, 'Message must be at most 500 characters').optional()
});

export const linkRequestActionSchema = z.object({
  action: z.enum(['accept', 'reject'], {
    errorMap: () => ({ message: 'Action must be either "accept" or "reject"' })
  })
});

export const studentSearchSchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters')
});

// Self-service profile update
export const updateProfileSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens')
    .optional(),
  displayName: z.string()
    .min(1, 'Display name must not be empty')
    .max(50, 'Display name must be at most 50 characters')
    .optional(),
}).refine(data => data.username !== undefined || data.displayName !== undefined, {
  message: 'At least one field must be provided'
});

// Wordlist validation schemas
export const createWordlistSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().default(''),
  visibility: z.enum(['private', 'shared']).optional().default('private'),
  words: z.array(z.object({
    targetWord: z.string().min(1).max(100),
    definitions: z.array(z.string().min(1)).min(1),
    synonyms: z.array(z.string()).optional().default([]),
    exampleSentences: z.array(z.string()).optional().default([]),
  })).min(1).max(10000)
});

export const updateWordlistSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
});

export const setActiveWordlistSchema = z.object({
  wordlistId: z.number().int().positive(),
});

export const addWordsSchema = z.object({
  words: z.array(z.object({
    targetWord: z.string().min(1).max(100),
    definitions: z.array(z.string().min(1)).min(1),
    synonyms: z.array(z.string()).optional().default([]),
    exampleSentences: z.array(z.string()).optional().default([]),
  })).min(1).max(10000)
});

export const updateWordSchema = z.object({
  targetWord: z.string().min(1).max(100).optional(),
  definitions: z.array(z.string().min(1)).min(1).optional(),
  synonyms: z.array(z.string()).optional(),
  exampleSentences: z.array(z.string()).optional(),
});

// Admin: create user
export const adminCreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  role: z.enum(['student', 'parent', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, parent, or admin' })
  }),
  parentId: z.number().int().positive().nullable().optional(),
  email: z.string().email('Invalid email format').max(255).nullable().optional(),
});

// Admin: update role
export const adminUpdateRoleSchema = z.object({
  role: z.enum(['student', 'parent', 'admin'], {
    errorMap: () => ({ message: 'Role must be student, parent, or admin' })
  }),
});

// Admin: link parent
export const adminLinkParentSchema = z.object({
  parentId: z.number().int().positive().nullable(),
});

// Parent thresholds
export const parentThresholdsSchema = z.object({
  days_per_week: z.number().int().min(1).max(7),
  minutes_per_day: z.number().int().min(5).max(120),
});

// Study session
export const studySessionSchema = z.object({
  wordsReviewed: z.number().int().min(0),
  startTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
  endTime: z.string().datetime({ offset: true }).or(z.string().min(1)),
  words: z.array(z.string()).optional(),
});

// Group schemas
export const createGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  description: z.string().max(500, 'Description must be at most 500 characters').optional().default(''),
  maxMembers: z.number().int().min(2).max(200).optional().default(50),
});

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
}).refine(data => data.name !== undefined || data.description !== undefined, {
  message: 'At least one field must be provided'
});

export const joinGroupSchema = z.object({
  joinCode: z.string().length(6, 'Join code must be 6 characters'),
});

export const assignWordlistSchema = z.object({
  wordlistId: z.number().int().positive('Wordlist ID is required'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'], {
    errorMap: () => ({ message: 'Role must be "admin" or "member"' })
  }),
});

// Push token
export const pushTokenSchema = z.object({
  expoPushToken: z.string().min(1, 'expoPushToken is required'),
  platform: z.enum(['ios', 'android'], {
    errorMap: () => ({ message: 'platform must be "ios" or "android"' })
  }),
});
