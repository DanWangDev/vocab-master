import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BookOpen, Brain, Trophy, Volume2, VolumeX, Flame, List, Award, BarChart3, Users, TrendingUp, Layers, PenTool, Swords, Type, Clock, Gift } from 'lucide-react';
import { ModeCard } from './ModeCard';
import { CompactCard } from './CompactCard';
import { UserMenu } from '../common/UserMenu';
import { NotificationBell } from '../notifications/NotificationBell';
import { LinkRequestCard } from '../linking/LinkRequestCard';
import { WordlistBadge } from '../wordlists/WordlistBadge';
import { WordlistSelector } from '../wordlists/WordlistSelector';
import { StreakFlame } from '../gamification/StreakFlame';
import { ActivityHeatmap } from '../gamification/ActivityHeatmap';
import { LevelBadge } from '../gamification/LevelBadge';
import { XpProgressBar } from '../gamification/XpProgressBar';
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
          {/* Greeting + Gamification Header */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-primary-100 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-2xl font-black text-primary-900 mb-1">
                    {t('greeting', { name: authState.user?.displayName || authState.user?.username })} 👋
                  </h2>
                  {userRole === 'student' ? (
                    <p className="text-primary-600 font-medium">{t('readyToLearn')}</p>
                  ) : (
                    <p className="text-primary-600 font-medium">{t('welcomeDashboard')}</p>
                  )}
                </div>
                {userRole === 'student' && activityStats && (
                  <StreakFlame streak={activityStats.currentStreak} />
                )}
              </div>
              {userRole === 'student' && (
                <div className="mt-3 pt-3 border-t border-primary-50">
                  <div className="flex items-center gap-3 mb-2">
                    <LevelBadge />
                  </div>
                  <XpProgressBar />
                </div>
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

              {/* Quick Stats - Inline */}
              {activityStats && (
                <div className="bg-white rounded-2xl p-4 border border-primary-100/50 shadow-sm">
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-quiz-light flex items-center justify-center mb-1 text-quiz-dark">
                        <Brain size={14} strokeWidth={3} />
                      </div>
                      <p className="text-lg font-black text-gray-800">{activityStats.quizCount}</p>
                      <p className="text-[9px] text-gray-500 font-bold">{t('statsQuizzes')}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mb-1 text-green-600">
                        <Trophy size={14} strokeWidth={3} />
                      </div>
                      <p className="text-lg font-black text-gray-800">{activityStats.avgAccuracy}%</p>
                      <p className="text-[9px] text-gray-500 font-bold">{t('statsAccuracy')}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-study-light flex items-center justify-center mb-1 text-study-dark">
                        <BookOpen size={14} strokeWidth={3} />
                      </div>
                      <p className="text-lg font-black text-gray-800">{activityStats.wordsReviewed}</p>
                      <p className="text-[9px] text-gray-500 font-bold">{t('statsReviewed')}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-lg bg-challenge-light flex items-center justify-center mb-1 text-challenge-dark">
                        <Flame size={14} strokeWidth={3} />
                      </div>
                      <p className="text-lg font-black text-gray-800">{activityStats.currentStreak}</p>
                      <p className="text-[9px] text-gray-500 font-bold">{t('statsStreak')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Activity Heatmap */}
              <ActivityHeatmap />

              {/* Primary actions - Full-width cards */}
              <ModeCard
                title={t('studyMode')}
                description={t('studyModeDesc')}
                icon={BookOpen}
                color="study"
                onClick={() => handleModeSelect('study')}
              />
              <ModeCard
                title={t('quizMode')}
                description={t('quizModeDesc')}
                icon={Brain}
                color="quiz"
                onClick={() => handleModeSelect('quiz')}
              />
              <ModeCard
                title={t('dailyChallenge')}
                description={t('dailyChallengeDesc')}
                icon={Trophy}
                color="challenge"
                onClick={() => handleModeSelect('challenge')}
                badge={hasTodayChallenge ? t('badgeDone') : t('badgeNew')}
              />

              {/* More activities - Compact 2-column grid */}
              <div>
                <h3 className="text-xs font-black text-primary-400 uppercase tracking-widest mb-3">
                  {t('moreActivities')}
                </h3>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  <CompactCard
                    title={t('flashcards')}
                    icon={Layers}
                    color="bg-gradient-to-br from-fuchsia-500 to-pink-600 shadow-[rgba(217,70,239,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/flashcards')}
                  />
                  <CompactCard
                    title={t('sentenceBuild')}
                    icon={PenTool}
                    color="bg-gradient-to-br from-lime-500 to-green-600 shadow-[rgba(132,204,22,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/exercises/sentence-build')}
                  />
                  <CompactCard
                    title={t('spelling')}
                    icon={Type}
                    color="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-[rgba(16,185,129,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/exercises/spelling')}
                  />
                  <CompactCard
                    title={t('timedChallenge')}
                    icon={Clock}
                    color="bg-gradient-to-br from-amber-500 to-orange-600 shadow-[rgba(245,158,11,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/quiz/timed')}
                  />
                  <CompactCard
                    title={t('pvpChallenges')}
                    icon={Swords}
                    color="bg-gradient-to-br from-red-500 to-orange-600 shadow-[rgba(239,68,68,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/pvp')}
                  />
                  <CompactCard
                    title={t('leaderboard')}
                    icon={BarChart3}
                    color="bg-gradient-to-br from-sky-500 to-blue-600 shadow-[rgba(14,165,233,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/leaderboard')}
                  />
                  <CompactCard
                    title={t('achievements')}
                    icon={Award}
                    color="bg-gradient-to-br from-violet-500 to-purple-600 shadow-[rgba(139,92,246,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/achievements')}
                  />
                  <CompactCard
                    title={t('myProgress')}
                    icon={TrendingUp}
                    color="bg-gradient-to-br from-indigo-500 to-blue-600 shadow-[rgba(99,102,241,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/reports')}
                  />
                  <CompactCard
                    title={t('rewards')}
                    icon={Gift}
                    color="bg-gradient-to-br from-amber-500 to-yellow-600 shadow-[rgba(245,158,11,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/rewards')}
                  />
                  <CompactCard
                    title={t('groups')}
                    icon={Users}
                    color="bg-gradient-to-br from-cyan-500 to-teal-600 shadow-[rgba(6,182,212,0.25)_0px_6px_16px]"
                    onClick={() => navigate('/groups')}
                  />
                </div>
              </div>
            </>
          )}

        </motion.div>
      </main>

      {/* Wordlist Selector Modal */}
      <WordlistSelector isOpen={showSelector} onClose={() => setShowSelector(false)} />
    </div>
  );
}
