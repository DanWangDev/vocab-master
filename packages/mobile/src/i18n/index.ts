import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import commonEn from '@vocab-master/shared/i18n/locales/en/common.json';
import authEn from '@vocab-master/shared/i18n/locales/en/auth.json';
import dashboardEn from '@vocab-master/shared/i18n/locales/en/dashboard.json';
import studyEn from '@vocab-master/shared/i18n/locales/en/study.json';
import quizEn from '@vocab-master/shared/i18n/locales/en/quiz.json';
import challengeEn from '@vocab-master/shared/i18n/locales/en/challenge.json';
import adminEn from '@vocab-master/shared/i18n/locales/en/admin.json';
import parentEn from '@vocab-master/shared/i18n/locales/en/parent.json';
import notificationsEn from '@vocab-master/shared/i18n/locales/en/notifications.json';
import linkingEn from '@vocab-master/shared/i18n/locales/en/linking.json';
import wordlistsEn from '@vocab-master/shared/i18n/locales/en/wordlists.json';

import commonZh from '@vocab-master/shared/i18n/locales/zh-CN/common.json';
import authZh from '@vocab-master/shared/i18n/locales/zh-CN/auth.json';
import dashboardZh from '@vocab-master/shared/i18n/locales/zh-CN/dashboard.json';
import studyZh from '@vocab-master/shared/i18n/locales/zh-CN/study.json';
import quizZh from '@vocab-master/shared/i18n/locales/zh-CN/quiz.json';
import challengeZh from '@vocab-master/shared/i18n/locales/zh-CN/challenge.json';
import adminZh from '@vocab-master/shared/i18n/locales/zh-CN/admin.json';
import parentZh from '@vocab-master/shared/i18n/locales/zh-CN/parent.json';
import notificationsZh from '@vocab-master/shared/i18n/locales/zh-CN/notifications.json';
import linkingZh from '@vocab-master/shared/i18n/locales/zh-CN/linking.json';
import wordlistsZh from '@vocab-master/shared/i18n/locales/zh-CN/wordlists.json';

const deviceLanguage = getLocales()[0]?.languageTag ?? 'en';
const supportedLanguage = deviceLanguage.startsWith('zh') ? 'zh-CN' : 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: commonEn,
      auth: authEn,
      dashboard: dashboardEn,
      study: studyEn,
      quiz: quizEn,
      challenge: challengeEn,
      admin: adminEn,
      parent: parentEn,
      notifications: notificationsEn,
      linking: linkingEn,
      wordlists: wordlistsEn,
    },
    'zh-CN': {
      common: commonZh,
      auth: authZh,
      dashboard: dashboardZh,
      study: studyZh,
      quiz: quizZh,
      challenge: challengeZh,
      admin: adminZh,
      parent: parentZh,
      notifications: notificationsZh,
      linking: linkingZh,
      wordlists: wordlistsZh,
    },
  },
  lng: supportedLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [
    'common',
    'auth',
    'dashboard',
    'study',
    'quiz',
    'challenge',
    'admin',
    'parent',
    'notifications',
    'linking',
    'wordlists',
  ],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
