export const env = {
  OIDC_ISSUER: process.env.OIDC_ISSUER || 'http://localhost:3009',
  OIDC_INTERNAL_ISSUER: process.env.OIDC_INTERNAL_ISSUER || process.env.OIDC_ISSUER || 'http://localhost:3009',
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID || 'vocab-master-client',
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || '',
} as const;
