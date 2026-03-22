import { lazy, Suspense, useState, useEffect } from 'react';
import { createBrowserRouter, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { RootLayout } from '../layouts/RootLayout';
import { ProtectedRoute, RoleRoute } from '../components/routing';
import { useApp } from '../contexts/AppContext';
import ApiService from '../services/ApiService';
import { StudyMistakesMode } from '../components/study/StudyMistakesMode';

// Retry dynamic imports on failure (handles stale chunk hashes after deploys)
function lazyWithRetry<T extends Record<string, unknown>>(
  factory: () => Promise<T>,
  retries = 1
): Promise<T> {
  return factory().catch((error: unknown) => {
    if (retries > 0 && error instanceof TypeError && String(error.message).includes('dynamically imported module')) {
      // Force reload to get fresh asset manifest
      window.location.reload();
      // Return a never-resolving promise since we're reloading
      return new Promise<T>(() => {});
    }
    throw error;
  });
}

// Lazy load route components (using named exports, with stale-chunk retry)
const AuthPage = lazy(() => lazyWithRetry(() => import('../components/auth/AuthPage')).then(m => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() => lazyWithRetry(() => import('../components/auth/ResetPasswordPage')).then(m => ({ default: m.ResetPasswordPage })));
const Dashboard = lazy(() => lazyWithRetry(() => import('../components/dashboard/Dashboard')).then(m => ({ default: m.Dashboard })));
const StudyLanding = lazy(() => lazyWithRetry(() => import('../components/study/StudyLanding')).then(m => ({ default: m.StudyLanding })));
const StudyMode = lazy(() => lazyWithRetry(() => import('../components/study/StudyMode')).then(m => ({ default: m.StudyMode })));
const QuizMode = lazy(() => lazyWithRetry(() => import('../components/quiz/QuizMode')).then(m => ({ default: m.QuizMode })));
const DailyChallenge = lazy(() => lazyWithRetry(() => import('../components/challenge/DailyChallenge')).then(m => ({ default: m.DailyChallenge })));
const ParentDashboard = lazy(() => lazyWithRetry(() => import('../components/parent/ParentDashboard')).then(m => ({ default: m.ParentDashboard })));
const AdminPanel = lazy(() => lazyWithRetry(() => import('../components/admin/AdminPanel')).then(m => ({ default: m.AdminPanel })));
const WordlistManager = lazy(() => lazyWithRetry(() => import('../components/wordlists/WordlistManager')).then(m => ({ default: m.WordlistManager })));
const AchievementList = lazy(() => lazyWithRetry(() => import('../components/achievements/AchievementList')).then(m => ({ default: m.AchievementList })));
const LeaderboardPage = lazy(() => lazyWithRetry(() => import('../components/leaderboard/LeaderboardPage')).then(m => ({ default: m.LeaderboardPage })));
const GroupList = lazy(() => lazyWithRetry(() => import('../components/groups/GroupList')).then(m => ({ default: m.GroupList })));
const GroupDetailPage = lazy(() => lazyWithRetry(() => import('../components/groups/GroupDetail')).then(m => ({ default: m.GroupDetail })));
const CreateGroupPage = lazy(() => lazyWithRetry(() => import('../components/groups/CreateGroupPage')).then(m => ({ default: m.CreateGroupPage })));
const ReportsPage = lazy(() => lazyWithRetry(() => import('../components/reports/ReportsPage')).then(m => ({ default: m.ReportsPage })));
const FlashcardSession = lazy(() => lazyWithRetry(() => import('../components/flashcard/FlashcardSession')).then(m => ({ default: m.FlashcardSession })));
const SentenceBuildSession = lazy(() => lazyWithRetry(() => import('../components/exercises/SentenceBuildSession')).then(m => ({ default: m.SentenceBuildSession })));
const SpellingSession = lazy(() => lazyWithRetry(() => import('../components/spelling/SpellingSession')).then(m => ({ default: m.SpellingSession })));
const TimedQuizMode = lazy(() => lazyWithRetry(() => import('../components/quiz/TimedQuizMode')).then(m => ({ default: m.TimedQuizMode })));
const ChallengeList = lazy(() => lazyWithRetry(() => import('../components/pvp/ChallengeList')).then(m => ({ default: m.ChallengeList })));
const ChallengeQuiz = lazy(() => lazyWithRetry(() => import('../components/pvp/ChallengeQuiz')).then(m => ({ default: m.ChallengeQuiz })));
const ChallengeResults = lazy(() => lazyWithRetry(() => import('../components/pvp/ChallengeResults')).then(m => ({ default: m.ChallengeResults })));
const RewardsPage = lazy(() => lazyWithRetry(() => import('../components/gamification/RewardsPage')).then(m => ({ default: m.RewardsPage })));

// Loading fallback component — not exported, used internally for Suspense
// eslint-disable-next-line react-refresh/only-export-components
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-indigo-500 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Wrap component with Suspense
function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// Wrapper for practice mistakes mode - fetches weak words and filters vocabulary
// eslint-disable-next-line react-refresh/only-export-components
function StudyMistakesWrapper() {
  const { vocabulary } = useApp();
  const navigate = useNavigate();
  const [filteredWords, setFilteredWords] = useState<typeof vocabulary>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndFilter = async () => {
      try {
        const data = await ApiService.getWeakWords();
        const weakWordSet = new Set(data.weakWords.map(w => w.word.toLowerCase()));
        const filtered = vocabulary.filter(v =>
          weakWordSet.has(v.targetWord.toLowerCase())
        );

        if (filtered.length === 0) {
          // No weak words, redirect back to study landing
          navigate('/study');
          return;
        }

        setFilteredWords(filtered);
      } catch {
        navigate('/study');
      } finally {
        setLoading(false);
      }
    };
    fetchAndFilter();
  }, [vocabulary, navigate]);

  if (loading) {
    return <PageLoader />;
  }

  return <StudyMistakesMode words={filteredWords} />;
}

// Wrapper for review mode - filters vocabulary by words from URL query params
// eslint-disable-next-line react-refresh/only-export-components
function StudyReviewWrapper() {
  const { vocabulary } = useApp();
  const navigate = useNavigate();

  const params = new URLSearchParams(window.location.search);
  const wordsParam = params.get('words') || '';
  const wordSet = new Set(
    wordsParam.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
  );

  const filtered = vocabulary.filter(v =>
    wordSet.has(v.targetWord.toLowerCase())
  );

  if (filtered.length === 0) {
    navigate('/study');
    return <PageLoader />;
  }

  return <StudyMistakesMode words={filtered} />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withSuspense(AuthPage),
  },
  {
    path: '/reset-password',
    element: withSuspense(ResetPasswordPage),
  },
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: withSuspense(Dashboard),
          },
          {
            element: <RoleRoute allowedRoles={['student']} />,
            children: [
              {
                path: 'study',
                element: withSuspense(StudyLanding),
              },
              {
                path: 'study/all',
                element: withSuspense(StudyMode),
              },
              {
                path: 'study/mistakes',
                element: <StudyMistakesWrapper />,
              },
              {
                path: 'study/review',
                element: <StudyReviewWrapper />,
              },
              {
                path: 'quiz',
                element: withSuspense(QuizMode),
              },
              {
                path: 'challenge',
                element: withSuspense(DailyChallenge),
              },
              {
                path: 'achievements',
                element: withSuspense(AchievementList),
              },
              {
                path: 'leaderboard',
                element: withSuspense(LeaderboardPage),
              },
              {
                path: 'reports',
                element: withSuspense(ReportsPage),
              },
              {
                path: 'flashcards',
                element: withSuspense(FlashcardSession),
              },
              {
                path: 'exercises/sentence-build',
                element: withSuspense(SentenceBuildSession),
              },
              {
                path: 'exercises/spelling',
                element: withSuspense(SpellingSession),
              },
              {
                path: 'quiz/timed',
                element: withSuspense(TimedQuizMode),
              },
              {
                path: 'pvp',
                element: withSuspense(ChallengeList),
              },
              {
                path: 'pvp/:id/play',
                element: withSuspense(ChallengeQuiz),
              },
              {
                path: 'pvp/:id/results',
                element: withSuspense(ChallengeResults),
              },
              {
                path: 'rewards',
                element: withSuspense(RewardsPage),
              },
            ],
          },
          {
            path: 'parent',
            element: <RoleRoute allowedRoles={['parent']} />,
            children: [
              {
                index: true,
                element: withSuspense(ParentDashboard),
              },
            ],
          },
          {
            path: 'admin',
            element: <RoleRoute allowedRoles={['admin']} />,
            children: [
              {
                index: true,
                element: withSuspense(AdminPanel),
              },
            ],
          },
          {
            path: 'groups',
            children: [
              { index: true, element: withSuspense(GroupList) },
              { path: 'create', element: withSuspense(CreateGroupPage) },
              { path: ':id', element: withSuspense(GroupDetailPage) },
            ],
          },
          {
            path: 'wordlists',
            children: [
              {
                path: 'manage',
                element: <RoleRoute allowedRoles={['admin', 'parent']} />,
                children: [
                  { index: true, element: withSuspense(WordlistManager) },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
