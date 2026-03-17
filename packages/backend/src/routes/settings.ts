import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate, updateSettingsSchema } from '../middleware/validate.js';
import { settingsRepository } from '../repositories/userRepository.js';
import type { AuthRequest, UserSettings, UpdateSettingsRequest } from '../types/index.js';

const router = Router();

// All settings routes require authentication
router.use(authMiddleware);

// GET /api/settings
router.get('/', (req: AuthRequest, res: Response) => {
  try {
    let settings = settingsRepository.get(req.user!.userId);

    // Auto-create settings if they don't exist
    if (!settings) {
      settings = settingsRepository.createDefault(req.user!.userId);
    }

    const response: UserSettings = {
      soundEnabled: settings.sound_enabled === 1,
      autoAdvance: settings.auto_advance === 1,
      language: settings.language || 'en'
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get settings'
    });
  }
});

// PUT /api/settings
router.put('/', validate(updateSettingsSchema), (req: AuthRequest, res: Response) => {
  try {
    const { soundEnabled, autoAdvance, language } = req.body as UpdateSettingsRequest;

    // Auto-create settings if they don't exist before updating
    if (!settingsRepository.get(req.user!.userId)) {
      settingsRepository.createDefault(req.user!.userId);
    }

    const settings = settingsRepository.update(
      req.user!.userId,
      soundEnabled,
      autoAdvance,
      language
    );

    const response: UserSettings = {
      soundEnabled: settings.sound_enabled === 1,
      autoAdvance: settings.auto_advance === 1,
      language: settings.language || 'en'
    };

    res.json(response);
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to update settings'
    });
  }
});

export default router;
