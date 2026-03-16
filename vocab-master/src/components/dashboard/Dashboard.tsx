import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Trophy, Volume2, VolumeX, Flame, List, Award, BarChart3, Users, TrendingUp } from 'lucide-react';
import { ModeCard } from './ModeCard';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { LinkRequestCard } from '../linking/LinkRequestCard';
import { WordlistBadge } from '../wordlists/WordlistBadge';
import { WordlistSelector } from '../wordlists/WordlistSelector';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useAudio } from '../../hooks/useAudio';
import { StorageService } from '../../services/StorageService';
import ApiService from '../../services/ApiService';

interface ActivityStats {
  quizCount: number;
  avgAccuracy: number;
  bestScore: number;
  studySessions: number;
  wordsReviewed: number;
  currentStreak: number;
}

export function Dashboard() {
  const { t } = useTranslation('dashboard');
  const { t: tWl } = useTranslation('wordlists');
  const { vocabulary } = useApp();
  const { state: authState } = useAuth();
  const { soundEnabled, toggleSound, playClick } = useAudio();
  const { linkRequests, respondToLinkRequest } = useNotifications();
  const navigate = useNavigate();

  const hasTodayChallenge = StorageService.hasTodayChallenge();
  const userRole = authState.user?.role || 'student';
  const [showSelector, setShowSelector] = useState(false);

  // Fetch activity-based stats for students
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);

  useEffect(() => {
    if (userRole === 'student') {
      ApiService.getActivityStats()
        .then(setActivityStats)
        .catch(err => console.error('Failed to fetch activity stats:', err));
    }
  }, [userRole]);

  const handleModeSelect = (mode: 'study' | 'quiz' | 'challenge') => {
    playClick();
    navigate(`/${mode}`);
  };

  return (
    <div className="min-h-screen bg-[#F0F9FF] background-pattern">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white backdrop-blur-md border-b border-primary-100 sticky top-0 z-50"
      >
        <div className="max-w-xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary-100 p-2 rounded-2xl">
                <BookOpen className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-primary-900 tracking-tight">
                  Vocabulary Master
                </h1>
                <p className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded-full inline-block mt-1">
                  {vocabulary.length} words
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sound toggle */}
              <button
                onClick={toggleSound}
                className={`
                  p-3 rounded-full cursor-pointer
                  bg-white border-2 border-primary-100
                  text-primary-500 hover:text-primary-700 hover:border-primary-300
                  hover:bg-primary-50
                  transition-all duration-200
                  active:scale-95
                `}
                aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>

              <NotificationBell />
              <UserMenu />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="max-w-xl mx-auto px-4 pt-4 pb-20">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-5"
        >
          {/* Greeting */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-primary-100 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-primary-900 mb-1">
                {t('greeting', { name: authState.user?.displayName || authState.user?.username })} 👋
              </h2>
              {userRole === 'student' ? (
                <p className="text-primary-600 font-medium">{t('readyToLearn')}</p>
              ) : (
                <p className="text-primary-600 font-medium">{t('welcomeDashboard')}</p>
              )}
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-100 rounded-full opacity-50 blur-xl"></div>
          </div>

          {/* Active Wordlist Badge */}
          <WordlistBadge onClick={() => setShowSelector(true)} />

          {/* Role-based Content */}
          {userRole === 'admin' ? (
            <>
              <ModeCard
                title={t('adminPanel')}
                description={t('adminPanelDesc')}
                icon={Brain}
                color="quiz"
                onClick={() => navigate('/admin')}
              />
              <ModeCard
                title={tWl('manageWordlists')}
                description={tWl('manageTitle')}
                icon={List}
                color="study"
                onClick={() => navigate('/wordlists/manage')}
              />
            </>
          ) : userRole === 'parent' ? (
            <>
              <ModeCard
                title={t('parentDashboard')}
                description={t('parentDashboardDesc')}
                icon={Trophy}
                color="challenge"
                onClick={() => navigate('/parent')}
              />
              <ModeCard
                title={tWl('manageWordlists')}
                description={tWl('manageTitle')}
                icon={List}
                color="study"
                onClick={() => navigate('/wordlists/manage')}
              />
              <ModeCard
                title={t('groups')}
                description={t('groupsDesc')}
                icon={Users}
                color="groups"
                onClick={() => navigate('/groups')}
              />
            </>
          ) : (
            // Student Content
            <>
              {/* Pending Link Requests Banner */}
              {linkRequests.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-primary-600 uppercase tracking-wide">
                    {t('pendingLinkRequests')}
                  </h3>
                  {linkRequests.map(request => (
                    <LinkRequestCard
                      key={request.id}
                      request={request}
                      onAccept={(id) => respondToLinkRequest(id, 'accept')}
                      onReject={(id) => respondToLinkRequest(id, 'reject')}
                    />
                  ))}
                </div>
              )}
              {/* Study Mode */}
              <ModeCard
                title={t('studyMode')}
                description={t('studyModeDesc')}
                icon={BookOpen}
                color="study"
                onClick={() => handleModeSelect('study')}
              />

              {/* Quiz Mode */}
              <ModeCard
                title={t('quizMode')}
                description={t('quizModeDesc')}
                icon={Brain}
                color="quiz"
                onClick={() => handleModeSelect('quiz')}
              />

              {/* Daily Challenge */}
              <ModeCard
                title={t('dailyChallenge')}
                description={t('dailyChallengeDesc')}
                icon={Trophy}
                color="challenge"
                onClick={() => handleModeSelect('challenge')}
                badge={hasTodayChallenge ? t('badgeDone') : t('badgeNew')}
              />

              {/* Achievements */}
              <ModeCard
                title={t('achievements')}
                description={t('achievementsDesc')}
                icon={Award}
                color="achievement"
                onClick={() => navigate('/achievements')}
              />

              {/* Leaderboard */}
              <ModeCard
                title={t('leaderboard')}
                description={t('leaderboardDesc')}
                icon={BarChart3}
                color="leaderboard"
                onClick={() => navigate('/leaderboard')}
              />

              {/* Groups */}
              <ModeCard
                title={t('groups')}
                description={t('groupsDesc')}
                icon={Users}
                color="groups"
                onClick={() => navigate('/groups')}
              />

              {/* My Progress / Reports */}
              <ModeCard
                title={t('myProgress')}
                description={t('myProgressDesc')}
                icon={TrendingUp}
                color="reports"
                onClick={() => navigate('/reports')}
              />
            </>
          )}

        </motion.div>

        {/* Stats summary - Only for Students */}
        {userRole === 'student' && activityStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-6 bg-white rounded-3xl border-2 border-primary-100/50 shadow-xl shadow-primary-100/50"
          >
            <h2 className="text-sm font-black text-primary-400 uppercase tracking-widest mb-4 text-center">
              {t('yourStats')}
            </h2>
            <div className="grid grid-cols-4 gap-3">
              {/* Quizzes */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-quiz-light flex items-center justify-center mb-1.5 text-quiz-dark">
                  <Brain size={18} strokeWidth={3} />
                </div>
                <p className="text-xl font-black text-gray-800">
                  {activityStats.quizCount}
                </p>
                <p className="text-[10px] text-gray-500 font-bold">{t('statsQuizzes')}</p>
              </div>
              {/* Accuracy */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mb-1.5 text-green-600">
                  <Trophy size={18} strokeWidth={3} />
                </div>
                <p className="text-xl font-black text-gray-800">
                  {activityStats.avgAccuracy}%
                </p>
                <p className="text-[10px] text-gray-500 font-bold">{t('statsAccuracy')}</p>
              </div>
              {/* Words Reviewed */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-study-light flex items-center justify-center mb-1.5 text-study-dark">
                  <BookOpen size={18} strokeWidth={3} />
                </div>
                <p className="text-xl font-black text-gray-800">
                  {activityStats.wordsReviewed}
                </p>
                <p className="text-[10px] text-gray-500 font-bold">{t('statsReviewed')}</p>
              </div>
              {/* Streak */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-xl bg-challenge-light flex items-center justify-center mb-1.5 text-challenge-dark">
                  <Flame size={18} strokeWidth={3} />
                </div>
                <p className="text-xl font-black text-gray-800">
                  {activityStats.currentStreak}
                </p>
                <p className="text-[10px] text-gray-500 font-bold">{t('statsStreak')}</p>
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* Wordlist Selector Modal */}
      <WordlistSelector isOpen={showSelector} onClose={() => setShowSelector(false)} />
    </div>
  );
}
