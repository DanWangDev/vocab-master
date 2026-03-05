# Profile Completion & Self-Service Editing

> **Status:** Implemented
> **Date:** 2026-03-05

## Context

Google OAuth auto-creates parent accounts with a username derived from email (e.g. `john_doe` from `john.doe@gmail.com`) and a display name from the Google profile. Users previously had no way to customize these values. This feature adds:

1. A **profile completion modal** shown to new Google users after their first sign-in
2. **Ongoing self-service profile editing** from the parent dashboard

## Backend

### New endpoint

```
PATCH /api/auth/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "username": "new_username",    // optional
  "displayName": "New Name"      // optional (at least one required)
}
```

**Responses:**
- `200` — `{ user }` with updated fields
- `400` — Validation error (invalid username format, etc.)
- `401` — Not authenticated
- `409` — Username already taken

### Validation schema (`updateProfileSchema`)

- `username` — optional, 3–30 chars, alphanumeric + underscores/hyphens
- `displayName` — optional, 1–50 chars
- At least one field must be provided (Zod `.refine()`)

### Files changed

| File | Change |
|------|--------|
| `backend/src/middleware/validate.ts` | Added `updateProfileSchema` |
| `backend/src/repositories/userRepository.ts` | Added `updateUsername()` method |
| `backend/src/services/authService.ts` | Added `updateProfile()` method (uniqueness check + repo calls) |
| `backend/src/routes/auth.ts` | Added `PATCH /api/auth/profile` route |
| `backend/src/types/index.ts` | Added `UpdateProfileRequest` interface |

## Web Frontend

### Profile completion modal

`src/components/auth/CompleteProfileModal.tsx` — a reusable modal with two modes:

- **`complete` mode** — shown automatically after first Google sign-in (`isNewGoogleUser === true`). Pre-fills the derived username and Google display name. Offers "Skip" and "Save" buttons.
- **`edit` mode** — opened manually from the parent dashboard header (pencil icon next to the user's name). Shows "Cancel" and "Save" buttons.

### AuthContext changes

- Added `isNewGoogleUser: boolean` to `AuthState`
- Added `SET_NEW_GOOGLE_USER` and `UPDATE_USER` reducer actions
- `googleLogin()` now sets `isNewGoogleUser: true` when the API returns `isNewUser === true`
- Added `updateProfile()` — calls `ApiService.updateProfile()`, then dispatches `UPDATE_USER`
- Added `clearNewGoogleUser()` — resets the flag after modal close/skip

### ParentDashboard changes

- Shows `CompleteProfileModal` in `complete` mode when `state.isNewGoogleUser` is true
- Pencil edit icon next to parent's name in the header opens the modal in `edit` mode
- Profile save refreshes user state via `updateProfile()`

### ApiService

Added `updateProfile({ username?, displayName? })` → `PATCH /api/auth/profile`

### Files changed

| File | Change |
|------|--------|
| `src/services/ApiService.ts` | Added `updateProfile()` method |
| `src/contexts/AuthContext.tsx` | Added state, actions, and methods for profile |
| `src/components/auth/CompleteProfileModal.tsx` | **New file** — modal component |
| `src/components/parent/ParentDashboard.tsx` | Added edit icon + modal rendering |

## Mobile (API only)

Mobile `ApiService` and `AuthContext` were updated with the same `updateProfile()` method and `isNewGoogleUser` state tracking. The mobile UI for the profile completion modal is deferred to a future task.

| File | Change |
|------|--------|
| `mobile/src/services/ApiService.ts` | Added `updateProfile()` method |
| `mobile/src/contexts/AuthContext.tsx` | Added state, actions, and methods for profile |

## i18n

### `auth.json` (en + zh-CN)

| Key | EN | ZH-CN |
|-----|-----|-------|
| `completeProfile.title` | Complete Your Profile | 完善你的资料 |
| `completeProfile.subtitle` | Customize your username and display name | 自定义你的用户名和显示名称 |
| `completeProfile.skip` | Skip for now | 暂时跳过 |
| `completeProfile.save` | Save | 保存 |
| `completeProfile.saved` | Profile updated! | 资料已更新！ |

### `parent.json` (en + zh-CN)

| Key | EN | ZH-CN |
|-----|-----|-------|
| `editProfile` | Edit Profile | 编辑资料 |

## User Flows

### New Google user
1. Click "Continue with Google" on auth page
2. Account created with derived username and Google display name
3. Redirected to parent dashboard
4. `CompleteProfileModal` appears automatically (complete mode)
5. User edits username and/or display name
6. Click "Save" → API updates profile → modal closes
7. (Or click "Skip" → modal closes, defaults kept)

### Returning Google user
1. Click "Continue with Google"
2. Logs in normally (`isNewUser: false`)
3. No modal shown

### Edit profile later
1. On parent dashboard, click pencil icon next to name in header
2. `CompleteProfileModal` opens in edit mode
3. Edit fields → Save → profile updated
4. (Or Cancel → modal closes, no changes)

### Username uniqueness
- If user tries to change to an existing username, the API returns 409
- Modal displays the error message inline
