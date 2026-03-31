// Use getters so values are read lazily — after dotenv.config() has run in index.ts.
// Static property reads at module-load time would capture empty strings because
// TypeScript hoists all imports above inline code (dotenv.config() call).
export const env = {
  get OIDC_ISSUER() { return process.env.OIDC_ISSUER || 'http://localhost:3009'; },
  get OIDC_INTERNAL_ISSUER() { return process.env.OIDC_INTERNAL_ISSUER || process.env.OIDC_ISSUER || 'http://localhost:3009'; },
  get OIDC_CLIENT_ID() { return process.env.OIDC_CLIENT_ID || 'vocab-master-client'; },
  get OIDC_CLIENT_SECRET() { return process.env.OIDC_CLIENT_SECRET || ''; },
};
