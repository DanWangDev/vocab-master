import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider } from '../contexts/AppContext';
import { AchievementProvider } from '../contexts/AchievementContext';
import { useAuth } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/common/ErrorBoundary';

export function RootLayout() {
  const { state: authState } = useAuth();
  const location = useLocation();

  // Handle keyboard navigation for Study Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keys when in study mode
      if (location.pathname !== '/study') return;

      // These keys will be handled by the StudyMode component
      // This is just to prevent default browser behavior
      if (['ArrowLeft', 'ArrowRight', ' ', 'Enter'].includes(e.key)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [location.pathname]);

  return (
    <AppProvider isAuthenticated={authState.isAuthenticated}>
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ErrorBoundary>
              <AchievementProvider>
                <Outlet />
              </AchievementProvider>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </div>
    </AppProvider>
  );
}
