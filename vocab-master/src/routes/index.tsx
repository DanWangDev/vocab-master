import { lazy, Suspense, useState, useEffect } from 'react';
import { createBrowserRouter, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { RootLayout } from '../layouts/RootLayout';
import { ProtectedRoute, RoleRoute } from '../components/routing';
import { useApp } from '../contexts/AppContext';
import ApiService from '../services/ApiService';
import { StudyMistakesMode } from '../components/study/StudyMistakesMode';

// Lazy load route components (using named exports)
const AuthPage = lazy(() => import('../components/auth/AuthPage').then(m => ({ default: m.AuthPage })));
const ResetPasswordPage = lazy(() => import('../components/auth/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const Dashboard = lazy(() => import('../components/dashboard/Dashboard').then(m => ({ default: m.Dashboard })));
const StudyLanding = lazy(() => import('../components/study/StudyLanding').then(m => ({ default: m.StudyLanding })));
const StudyMode = lazy(() => import('../components/study/StudyMode').then(m => ({ default: m.StudyMode })));
const QuizMode = lazy(() => import('../components/quiz/QuizMode').then(m => ({ default: m.QuizMode })));
const DailyChallenge = lazy(() => import('../components/challenge/DailyChallenge').then(m => ({ default: m.DailyChallenge })));
const ParentDashboard = lazy(() => import('../components/parent/ParentDashboard').then(m => ({ default: m.ParentDashboard })));
const AdminPanel = lazy(() => import('../components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const WordlistManager = lazy(() => import('../components/wordlists/WordlistManager').then(m => ({ default: m.WordlistManager })));

// Loading fallback component
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
      } catch (err) {
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
