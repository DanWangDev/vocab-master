import NetInfo from '@react-native-community/netinfo';
import { DatabaseService } from './DatabaseService';
import type { SyncQueueItem } from './DatabaseService';
import { ApiService } from './ApiService';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

type SyncListener = (pendingCount: number) => void;

class OfflineSyncServiceClass {
  private processing = false;
  private listeners: Set<SyncListener> = new Set();

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners(): Promise<void> {
    const count = await DatabaseService.getSyncQueueCount();
    for (const listener of this.listeners) {
      listener(count);
    }
  }

  async queueRequest(
    action: string,
    endpoint: string,
    method: string,
    body: unknown
  ): Promise<void> {
    await DatabaseService.addToSyncQueue(action, endpoint, method, body);
    await this.notifyListeners();
  }

  async processQueue(): Promise<{ processed: number; failed: number }> {
    if (this.processing) return { processed: 0, failed: 0 };

    const netState = await NetInfo.fetch();
    if (!netState.isConnected || netState.isInternetReachable === false) {
      return { processed: 0, failed: 0 };
    }

    this.processing = true;
    let processed = 0;
    let failed = 0;

    try {
      const items = await DatabaseService.getSyncQueue();

      for (const item of items) {
        const success = await this.processItem(item);
        if (success) {
          await DatabaseService.removeSyncQueueItem(item.id);
          processed++;
        } else {
          await DatabaseService.incrementRetryCount(item.id);
          if (item.retryCount + 1 >= MAX_RETRIES) {
            await DatabaseService.removeSyncQueueItem(item.id);
            failed++;
          }
        }
      }
    } finally {
      this.processing = false;
      await this.notifyListeners();
    }

    return { processed, failed };
  }

  private async processItem(item: SyncQueueItem): Promise<boolean> {
    const delay = BASE_DELAY_MS * Math.pow(2, item.retryCount);

    if (item.retryCount > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    try {
      const body = JSON.parse(item.body);

      switch (item.action) {
        case 'save_quiz_result':
          await ApiService.saveQuizResult(body);
          return true;

        case 'save_study_session':
          await ApiService.saveStudySession(body);
          return true;

        case 'complete_challenge':
          await ApiService.completeChallenge(body.score);
          return true;

        case 'update_settings':
          await ApiService.updateSettings(body);
          return true;

        case 'update_stats':
          await ApiService.updateStats(body);
          return true;

        case 'increment_stats':
          await ApiService.incrementStats(body);
          return true;

        default:
          return false;
      }
    } catch {
      return false;
    }
  }

  async getPendingCount(): Promise<number> {
    return DatabaseService.getSyncQueueCount();
  }

  async clearQueue(): Promise<void> {
    await DatabaseService.clearSyncQueue();
    await this.notifyListeners();
  }
}

export const OfflineSyncService = new OfflineSyncServiceClass();
