// Override @danwangdev/auth-client's global Express.Request.user augmentation.
// The auth-client package sets user to HubUser, but we use JWTPayload throughout
// the app. Our middleware converts hub claims to JWTPayload before attaching to req.

import type { JWTPayload } from './index.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: JWTPayload;
  }
}
