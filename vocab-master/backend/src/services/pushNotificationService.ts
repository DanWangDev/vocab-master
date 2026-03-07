import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { pushTokenRepository } from '../repositories/index.js';
import { logger } from './logger.js';

const expo = new Expo();

export const pushNotificationService = {
  async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const tokens = pushTokenRepository.findByUserId(userId);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter(t => Expo.isExpoPushToken(t.expo_push_token))
      .map(t => ({
        to: t.expo_push_token,
        sound: 'default' as const,
        title,
        body,
        data,
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
        this.handleTickets(tickets, tokens.map(t => t.expo_push_token));
      } catch (error) {
        logger.error('Failed to send push notifications', { error: String(error) });
      }
    }
  },

  async sendToUsers(
    userIds: number[],
    title: string,
    body: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const tokens = pushTokenRepository.findByUserIds(userIds);
    if (tokens.length === 0) return;

    const messages: ExpoPushMessage[] = tokens
      .filter(t => Expo.isExpoPushToken(t.expo_push_token))
      .map(t => ({
        to: t.expo_push_token,
        sound: 'default' as const,
        title,
        body,
        data,
      }));

    if (messages.length === 0) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets: ExpoPushTicket[] = await expo.sendPushNotificationsAsync(chunk);
        this.handleTickets(tickets, tokens.map(t => t.expo_push_token));
      } catch (error) {
        logger.error('Failed to send push notifications', { error: String(error) });
      }
    }
  },

  handleTickets(tickets: ExpoPushTicket[], pushTokens: string[]): void {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket.status === 'error') {
        logger.error('Push notification error', { error: String(ticket.message) });
        if (ticket.details?.error === 'DeviceNotRegistered' && pushTokens[i]) {
          pushTokenRepository.deleteByToken(pushTokens[i]);
        }
      }
    }
  },
};
