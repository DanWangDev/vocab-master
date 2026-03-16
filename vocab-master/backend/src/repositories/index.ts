import { db } from '../config/database.js';
import {
  SqliteUserRepository,
  SqliteSettingsRepository,
  SqliteStatsRepository,
} from './sqlite/SqliteUserRepository.js';
import { SqliteChallengeRepository } from './sqlite/SqliteChallengeRepository.js';
import { SqliteTokenRepository } from './sqlite/SqliteTokenRepository.js';
import { SqlitePasswordResetRepository } from './sqlite/SqlitePasswordResetRepository.js';
import { SqliteNotificationRepository } from './sqlite/SqliteNotificationRepository.js';
import { SqliteLinkRequestRepository } from './sqlite/SqliteLinkRequestRepository.js';
import { SqliteWordlistRepository } from './sqlite/SqliteWordlistRepository.js';
import { SqlitePushTokenRepository } from './sqlite/SqlitePushTokenRepository.js';
import { SqliteQuizResultRepository } from './sqlite/SqliteQuizResultRepository.js';

import type {
  IUserRepository,
  ISettingsRepository,
  IStatsRepository,
  IChallengeRepository,
  ITokenRepository,
  IPasswordResetRepository,
  INotificationRepository,
  ILinkRequestRepository,
  IWordlistRepository,
  IPushTokenRepository,
  IQuizResultRepository,
} from './interfaces/index.js';

// Create notification repo first since linkRequest depends on it
const notificationRepo: INotificationRepository = new SqliteNotificationRepository(db);
const userRepo: IUserRepository = new SqliteUserRepository(db);

export const userRepository: IUserRepository = userRepo;
export const settingsRepository: ISettingsRepository = new SqliteSettingsRepository(db);
export const statsRepository: IStatsRepository = new SqliteStatsRepository(db);
export const challengeRepository: IChallengeRepository = new SqliteChallengeRepository(db);
export const tokenRepository: ITokenRepository = new SqliteTokenRepository(db);
export const passwordResetRepository: IPasswordResetRepository = new SqlitePasswordResetRepository(db);
export const notificationRepository: INotificationRepository = notificationRepo;
export const linkRequestRepository: ILinkRequestRepository = new SqliteLinkRequestRepository(db, notificationRepo);
export const wordlistRepository: IWordlistRepository = new SqliteWordlistRepository(db);
export const pushTokenRepository: IPushTokenRepository = new SqlitePushTokenRepository(db);
export const quizResultRepository: IQuizResultRepository = new SqliteQuizResultRepository(db, userRepo);
