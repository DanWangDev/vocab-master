import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from parent directory if available
dotenv.config({ path: path.join(process.cwd(), '../.env') });
// Also try loading from current directory (will not overwrite existing keys)
dotenv.config();
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initializeDatabase, closeDatabase } from './config/database.js';
import { authRoutes, settingsRoutes, statsRoutes, challengesRoutes, migrateRoutes, quizResultsRoutes, studyStatsRoutes, adminRoutes, notificationsRoutes, linkRequestsRoutes, wordlistsRoutes, pushTokensRoutes } from './routes/index.js';
import { authService } from './services/authService.js';

const app = express();
app.set('trust proxy', 1); // Trust first main proxy (likely Nginx/Docker)
const PORT = process.env.PORT || 9876;

// Initialize database
initializeDatabase();

// Cleanup expired tokens periodically (every hour)
setInterval(() => {
  authService.cleanupExpiredTokens();
}, 60 * 60 * 1000);

// Middleware
app.use(helmet());

// Parse CORS origins (supports comma-separated values)
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Endpoint not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  closeDatabase();
  process.exit(0);
});

const HOST = process.env.HOST || '127.0.0.1';

app.listen(Number(PORT), HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/api/health`);
});

export default app;
