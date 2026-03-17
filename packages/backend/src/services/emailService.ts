import { Resend } from 'resend';
import { logger } from './logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Vocabulary Master <noreply@example.com>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Initialize Resend client (only if API key is configured)
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const emailService = {
  /**
   * Send a password reset email to the user
   * @param email - User's email address
   * @param resetToken - The raw reset token (not hashed)
   * @param displayName - Optional display name for personalization
   * @returns true if email was sent successfully, false otherwise
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    displayName?: string
  ): Promise<boolean> {
    if (!resend) {
      // In development without Resend configured, log minimal info (not the token)
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Resend API key not configured, email not sent', { email });
      }
      return false;
    }

    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const greeting = displayName ? `Hi ${displayName}` : 'Hi there';

    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Reset Your Password - Vocabulary Master',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Vocabulary Master</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="color: #1f2937; margin-top: 0;">${greeting}!</h2>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Reset Password</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">This link will expire in <strong>1 hour</strong>.</p>
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this, you can safely ignore this email. Your password won't be changed.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
${greeting}!

We received a request to reset your password for Vocabulary Master.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.
        `.trim(),
      });

      if (error) {
        logger.error('Failed to send password reset email', { error: String(error) });
        return false;
      }

      // Email sent successfully (don't log email in production)
      return true;
    } catch (error) {
      logger.error('Error sending password reset email', { error: String(error) });
      return false;
    }
  },

  /**
   * Send a notification that the password was changed
   * @param email - User's email address
   * @param displayName - Optional display name for personalization
   * @returns true if email was sent successfully, false otherwise
   */
  /**
   * Send a welcome email to new parent accounts
   * @param email - User's email address
   * @param displayName - Optional display name for personalization
   * @returns true if email was sent successfully, false otherwise
   */
  async sendWelcomeEmail(
    email: string,
    displayName?: string
  ): Promise<boolean> {
    if (!resend) {
      if (process.env.NODE_ENV !== 'production') {
        logger.warn('Resend API key not configured, welcome email not sent', { email });
      }
      return false;
    }

    const greeting = displayName ? `Hi ${displayName}` : 'Hi there';
    const loginUrl = `${FRONTEND_URL}/login`;

    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Welcome to Vocabulary Master!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Vocabulary Master!</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="color: #1f2937; margin-top: 0;">${greeting}!</h2>
              <p>Thank you for creating a parent account on Vocabulary Master. You're now ready to help your children build their vocabulary skills!</p>

              <h3 style="color: #4f46e5; margin-top: 24px;">What you can do:</h3>
              <ul style="color: #4b5563; padding-left: 20px;">
                <li>Monitor your children's learning progress</li>
                <li>View quiz scores and study statistics</li>
                <li>Track vocabulary words they're learning</li>
                <li>Reset passwords for linked student accounts</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">Go to Dashboard</a>
              </div>

              <p style="color: #6b7280; font-size: 14px;">If you have any questions, feel free to reach out. Happy learning!</p>

              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                You received this email because you created an account on Vocabulary Master.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
${greeting}!

Thank you for creating a parent account on Vocabulary Master. You're now ready to help your children build their vocabulary skills!

What you can do:
- Monitor your children's learning progress
- View quiz scores and study statistics
- Track vocabulary words they're learning
- Reset passwords for linked student accounts

Go to your dashboard: ${loginUrl}

If you have any questions, feel free to reach out. Happy learning!
        `.trim(),
      });

      if (error) {
        logger.error('Failed to send welcome email', { error: String(error) });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error sending welcome email', { error: String(error) });
      return false;
    }
  },

  async sendPasswordChangedNotification(
    email: string,
    displayName?: string
  ): Promise<boolean> {
    if (!resend) {
      // Resend API key not configured, skip notification
      return false;
    }

    const greeting = displayName ? `Hi ${displayName}` : 'Hi there';

    try {
      const { error } = await resend.emails.send({
        from: EMAIL_FROM,
        to: email,
        subject: 'Your Password Was Changed - Vocabulary Master',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Vocabulary Master</h1>
            </div>
            <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 16px 16px;">
              <h2 style="color: #1f2937; margin-top: 0;">${greeting}!</h2>
              <p>Your password has been successfully changed.</p>
              <p style="color: #6b7280;">If you made this change, no further action is needed.</p>
              <p style="color: #dc2626; font-weight: 500;">If you did not change your password, please contact us immediately as your account may have been compromised.</p>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated security notification from Vocabulary Master.
              </p>
            </div>
          </body>
          </html>
        `,
        text: `
${greeting}!

Your password has been successfully changed.

If you made this change, no further action is needed.

If you did not change your password, please contact us immediately as your account may have been compromised.

This is an automated security notification from Vocabulary Master.
        `.trim(),
      });

      if (error) {
        logger.error('Failed to send password changed notification', { error: String(error) });
        return false;
      }

      // Notification sent successfully
      return true;
    } catch (error) {
      logger.error('Error sending password changed notification', { error: String(error) });
      return false;
    }
  },
};
