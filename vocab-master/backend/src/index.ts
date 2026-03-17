import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from parent directory if available
dotenv.config({ path: path.join(process.cwd(), '../.env') });
// Also try loading from current directory (will not overwrite existing keys)
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, closeDatabase, db } from './config/database.js';
import { authRoutes, settingsRoutes, statsRoutes, challengesRoutes, migrateRoutes, quizResultsRoutes, studyStatsRoutes, adminRoutes, notificationsRoutes, linkRequestsRoutes, wordlistsRoutes, pushTokensRoutes, achievementsRoutes, leaderboardsRoutes, groupsRoutes, reportsRoutes, srsRoutes, exercisesRoutes, pvpRoutes } from './routes/index.js';
import { authService } from './services/authService.js';
import { inactivityService } from './services/inactivityService.js';
import { logger } from './services/logger.js';
import { AppError } from './errors/AppError.js';
import { jobQueue } from './jobs/jobQueue.js';
import { recalculateLeaderboards } from './services/leaderboardService.js';
import { pvpService } from './services/pvpService.js';

const app = express();
app.set('trust proxy', 1); // Trust first main proxy (likely Nginx/Docker)
const PORT = process.env.PORT || 9876;

// Initialize database
initializeDatabase();

// Register background jobs
jobQueue.register('token-cleanup', () => {
  authService.cleanupExpiredTokens();
}, 60 * 60 * 1000); // Every hour

jobQueue.register('inactivity-check', async () => {
  await inactivityService.checkInactivityAndNotify();
}, 6 * 60 * 60 * 1000); // Every 6 hours

jobQueue.register('leaderboard-recalc', () => {
  recalculateLeaderboards();
}, 15 * 60 * 1000); // Every 15 minutes

jobQueue.register('pvp-expiration', () => {
  pvpService.expireChallenges();
}, 60 * 60 * 1000); // Every hour

// Start all jobs
jobQueue.startAll();

// Middleware
app.use(helmet());

// Parse CORS origins (supports comma-separated values)
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  throw new Error('FATAL: CORS_ORIGIN must be set in production');
}
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: { error: 'Too Many Requests', message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for registration
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: { error: 'Too Many Requests', message: 'Too many registration attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Stricter rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour
  message: { error: 'Too Many Requests', message: 'Too many password reset attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { error: 'Too Many Requests', message: 'Please slow down your requests' },
  standardHeaders: true,
  legacyHeaders: false
});

// Student search rate limiter
const studentSearchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  message: { error: 'Too Many Requests', message: 'Too many search requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false
});

// Link request creation rate limiter
const linkRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour
  message: { error: 'Too Many Requests', message: 'Too many link requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Token validation rate limiter
const tokenValidationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too Many Requests', message: 'Too many token validation attempts' },
  standardHeaders: true,
  legacyHeaders: false
});

// Wordlist import rate limiter
const importLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 imports per hour
  message: { error: 'Too Many Requests', message: 'Too many import requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/wordlists/import', importLimiter);
app.use('/api/auth/register', registrationLimiter);
app.use('/api/auth/register/student', registrationLimiter);
app.use('/api/auth/register/parent', registrationLimiter);
app.use('/api/auth/google', registrationLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/validate-reset-token', tokenValidationLimiter);
app.use('/api/link-requests/search', studentSearchLimiter);
app.use('/api/link-requests', linkRequestLimiter);
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/challenges', challengesRoutes);
app.use('/api/migrate', migrateRoutes);
app.use('/api/quiz-results', quizResultsRoutes);
app.use('/api/study-stats', studyStatsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/link-requests', linkRequestsRoutes);
app.use('/api/wordlists', wordlistsRoutes);
app.use('/api/push-tokens', pushTokensRoutes);
app.use('/api/achievements', achievementsRoutes);
app.use('/api/leaderboards', leaderboardsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/srs', srsRoutes);
app.use('/api/exercises', exercisesRoutes);
app.use('/api/pvp', pvpRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  try {
    // Test DB connectivity
    const dbCheck = db.prepare('SELECT 1').get();

    // Get DB file size
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../data/vocab-master.db');
    let dbSizeBytes = 0;
    try {
      const stats = fs.statSync(dbPath);
      dbSizeBytes = stats.size;
    } catch {
      // DB file might not exist in test env
    }

    const memUsage = process.memoryUsage();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || '1.0.0',
      database: {
        connected: !!dbCheck,
        sizeBytes: dbSizeBytes,
        sizeMB: Math.round(dbSizeBytes / 1024 / 1024 * 100) / 100
      },
      memory: {
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100,
        heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100,
        rssMB: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100
      },
      jobs: jobQueue.getStatus()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Non-operational error', { error: err.message, code: err.code, stack: err.stack });
    }
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message
    });
    return;
  }

  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down...');
  jobQueue.stopAll();
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down...');
  jobQueue.stopAll();
  closeDatabase();
  process.exit(0);
});

const HOST = process.env.HOST || '127.0.0.1';

app.listen(Number(PORT), HOST, () => {
  logger.info('Server started', { host: HOST, port: Number(PORT) });
  logger.info('Health check available', { url: `http://${HOST}:${PORT}/api/health` });
});

export default app;
