import { OAuth2Client } from 'google-auth-library';

interface GoogleUserInfo {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

const CLIENT_IDS = [
  process.env.GOOGLE_CLIENT_ID_WEB,
  process.env.GOOGLE_CLIENT_ID_IOS,
  process.env.GOOGLE_CLIENT_ID_ANDROID,
].filter(Boolean) as string[];

const client = new OAuth2Client();

export const googleAuthService = {
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    if (CLIENT_IDS.length === 0) {
      throw new Error('Google OAuth is not configured');
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_IDS,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google ID token');
    }

    if (!payload.sub || !payload.email) {
      throw new Error('Google account missing required fields');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      emailVerified: payload.email_verified ?? false,
    };
  },

  async verifyAccessToken(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Invalid Google access token');
    }

    const payload = await response.json() as {
      sub?: string;
      email?: string;
      name?: string;
      email_verified?: boolean;
    };

    if (!payload.sub || !payload.email) {
      throw new Error('Google account missing required fields');
    }

    return {
      googleId: payload.sub,
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      emailVerified: payload.email_verified ?? false,
    };
  },

  async verifyToken(token: string, tokenType: 'id_token' | 'access_token' = 'id_token'): Promise<GoogleUserInfo> {
    if (tokenType === 'access_token') {
      return this.verifyAccessToken(token);
    }
    return this.verifyIdToken(token);
  },

  isConfigured(): boolean {
    return CLIENT_IDS.length > 0;
  },
};
