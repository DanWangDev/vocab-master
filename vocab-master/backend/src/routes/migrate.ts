import { Router, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { validate, importDataSchema } from '../middleware/validate.js';
import { settingsRepository } from '../repositories/userRepository.js';
import { computedStatsService } from '../services/computedStatsService';
import type { AuthRequest, UserSettings, UserStats } from '../types/index.js';

const router = Router();

// All migration routes require authentication
router.use(authMiddleware);

// POST /api/migrate/import - Import data from localStorage
router.post('/import', validate(importDataSchema), (req: AuthRequest, res: Response) => {
  try {
    const { settings } = req.body;
    const userId = req.user!.userId;

    let importedSettings: UserSettings | null = null;

    // Import settings if provided
    if (settings) {
      const updatedSettings = settingsRepository.update(
        userId,
        settings.soundEnabled,
        settings.autoAdvance,
        settings.language
      );
      importedSettings = {
        soundEnabled: updatedSettings.sound_enabled === 1,
        autoAdvance: updatedSettings.auto_advance === 1,
        language: updatedSettings.language || 'en'
      };
    }

    // Stats are now computed from raw tables; import is a no-op for stats.
    // Return current computed values for backward compatibility.
    const computedStats = computedStatsService.getComputedStats(userId);

    res.json({
      message: 'Data imported successfully',
      settings: importedSettings,
      stats: computedStats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to import data'
    });
  }
});

// GET /api/migrate/export - Export user data
router.get('/export', (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const settingsRow = settingsRepository.get(userId);

    const settings: UserSettings = settingsRow ? {
      soundEnabled: settingsRow.sound_enabled === 1,
      autoAdvance: settingsRow.auto_advance === 1,
      language: settingsRow.language || 'en'
    } : {
      soundEnabled: true,
      autoAdvance: false,
      language: 'en'
    };

    const stats: UserStats = computedStatsService.getComputedStats(userId);

    res.json({
      settings,
      stats
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to export data'
    });
  }
});

export default router;
