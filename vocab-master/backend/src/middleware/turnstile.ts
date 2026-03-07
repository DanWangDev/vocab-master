import { Request, Response, NextFunction } from 'express';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

export function verifyTurnstile(req: Request, res: Response, next: NextFunction): void {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // In development without key configured, skip verification
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      res.status(503).json({ error: 'Service Unavailable', message: 'Bot protection not configured' });
      return;
    }
    next();
    return;
  }

  // Mobile clients authenticate via shared app secret instead of Turnstile
  const mobileAppToken = req.headers['x-mobile-app-token'] as string | undefined;
  if (mobileAppToken && process.env.MOBILE_APP_SECRET && mobileAppToken === process.env.MOBILE_APP_SECRET) {
    next();
    return;
  }

  const token = req.body?.turnstileToken;

  if (!token) {
    res.status(403).json({ error: 'Forbidden', message: 'Bot verification failed' });
    return;
  }

  const clientIp = req.ip || req.socket.remoteAddress || '';

  fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: secretKey,
      response: token,
      remoteip: clientIp,
    }),
  })
    .then((response) => response.json() as Promise<TurnstileResponse>)
    .then((data) => {
      if (data.success) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden', message: 'Bot verification failed' });
      }
    })
    .catch(() => {
      res.status(403).json({ error: 'Forbidden', message: 'Bot verification failed' });
    });
}
