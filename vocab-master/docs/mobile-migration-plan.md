# Mobile Migration Plan

> **Status:** Implemented (Phases 1–6 complete)
> **Date:** 2026-02-10 (plan) | 2026-03-05 (status update)
> **Target:** iOS & Android via React Native (Expo)

## Background

WordCardShuffle ("Vocab Master") is a vocabulary learning web app built with React 19 + TypeScript + Vite, backed by an Express + SQLite REST API. This document captures the plan to bring the app to iOS and Android.

## Decision: React Native with Expo

After evaluating four options, **React Native (Expo)** was selected as the migration path.

### Options Considered

| Option | Effort | Code Reuse | Native Feel | Verdict |
|--------|--------|-----------|-------------|---------|
| **React Native (Expo)** | 4–6 weeks | ~80% | ✅ Excellent | ✅ Selected |
| Capacitor (WebView) | 1–2 weeks | ~100% | ⚠️ Mediocre | Rejected — performance/UX trade-offs, app store risk |
| Flutter | 8–12 weeks | 0% | ✅ Excellent | Rejected — complete rewrite in Dart |
| PWA | 1–2 days | 100% | ❌ Limited | Rejected — poor iOS support, no app store presence |

### Why React Native

- Existing codebase is React + TypeScript — team already has the skillset
- ~80% of business logic (API client, quiz engine, types, i18n, auth) reuses directly
- Backend requires zero changes — it's already a REST API with JWT auth
- Expo simplifies builds, OTA updates, and app store submissions

## What Transfers Directly

These files/modules work in React Native with zero or minimal changes:

| Module | Path | Notes |
|--------|------|-------|
| API Client | `services/ApiService.ts` | REST calls are identical |
| Quiz Engine | `services/QuizGenerator.ts` | Pure logic, no UI dependency |
| TypeScript Types | `types/` | Same data shapes everywhere |
| i18n Config | `i18n/` | i18next works in RN |
| Auth Context | `contexts/AuthContext.tsx` | React context API is the same |
| Notification Context | `contexts/NotificationContext.tsx` | React context API is the same |

## What Needs Replacement

| Web Library | Mobile Replacement |
|-------------|-------------------|
| `react-router-dom` | Expo Router or React Navigation |
| TailwindCSS | NativeWind (Tailwind for RN) |
| `framer-motion` | `react-native-reanimated` |
| `recharts` | `victory-native` or `react-native-gifted-charts` |
| `howler` (audio) | `expo-av` |
| `lucide-react` | `lucide-react-native` (drop-in) |
| `localStorage` | `@react-native-async-storage/async-storage` |
| HTML/CSS components | RN primitives (`View`, `Text`, `ScrollView`, etc.) |

## Backend Considerations

The existing Express + SQLite backend needs **no structural changes** for mobile. Optional additions:

- **Push notifications:** Add FCM (Android) + APNs (iOS) support via `expo-notifications`
- **Device registration endpoint:** Store push tokens per user
- **API versioning:** Consider adding `/api/v1/` prefix for future-proofing

## Phased Rollout

### Phase 1 — Monorepo Setup (1 week)
- Restructure repo into `packages/` monorepo (see [repo-structure.md](./repo-structure.md))
- Extract shared code into `@wordcard/shared` package
- Verify web app still works with new structure

### Phase 2 — Mobile Scaffold (1 week)
- Initialize Expo app in `packages/mobile`
- Set up navigation (Expo Router)
- Wire up shared `ApiService` and auth flow
- Implement login/register screens

### Phase 3 — Core Features (2–3 weeks)
- Study mode (flashcards)
- Quiz mode
- Dashboard with stats
- Word list management
- Daily challenges

### Phase 4 — Polish & Submit (1 week)
- Animations with `react-native-reanimated`
- Push notifications
- App icons, splash screens
- TestFlight (iOS) and internal testing (Android)
- App Store / Google Play submission
