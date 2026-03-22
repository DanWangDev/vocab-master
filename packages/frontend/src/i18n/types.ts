import 'i18next'

import type commonEn from './locales/en/common.json'
import type authEn from './locales/en/auth.json'
import type dashboardEn from './locales/en/dashboard.json'
import type studyEn from './locales/en/study.json'
import type quizEn from './locales/en/quiz.json'
import type challengeEn from './locales/en/challenge.json'
import type adminEn from './locales/en/admin.json'
import type parentEn from './locales/en/parent.json'
import type notificationsEn from './locales/en/notifications.json'
import type linkingEn from './locales/en/linking.json'
import type wordlistsEn from './locales/en/wordlists.json'
import type achievementsEn from './locales/en/achievements.json'
import type leaderboardEn from './locales/en/leaderboard.json'
import type groupsEn from './locales/en/groups.json'
import type reportsEn from './locales/en/reports.json'
import type flashcardEn from './locales/en/flashcard.json'
import type exercisesEn from './locales/en/exercises.json'
import type pvpEn from './locales/en/pvp.json'
import type gamificationEn from './locales/en/gamification.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof commonEn
      auth: typeof authEn
      dashboard: typeof dashboardEn
      study: typeof studyEn
      quiz: typeof quizEn
      challenge: typeof challengeEn
      admin: typeof adminEn
      parent: typeof parentEn
      notifications: typeof notificationsEn
      linking: typeof linkingEn
      wordlists: typeof wordlistsEn
      achievements: typeof achievementsEn
      leaderboard: typeof leaderboardEn
      groups: typeof groupsEn
      reports: typeof reportsEn
      flashcard: typeof flashcardEn
      exercises: typeof exercisesEn
      pvp: typeof pvpEn
      gamification: typeof gamificationEn
    }
  }
}
