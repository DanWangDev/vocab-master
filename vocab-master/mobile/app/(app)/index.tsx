import { useState, useEffect } from 'react';
import type { ElementType } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { BookOpen, Brain, Trophy, Flame, Volume2, VolumeX } from 'lucide-react-native';
import { ModeCard } from '../../src/components/dashboard/ModeCard';
import { useAuth, useApp } from '../../src/contexts';
import { ApiService } from '../../src/services';
import { audioManager } from '../../src/services/AudioManager';
import { colors } from '../../src/theme';

interface ActivityStats {
  quizCount: number;
  avgAccuracy: number;
  bestScore: number;
  studySessions: number;
  wordsReviewed: number;
  currentStreak: number;
}

export default function DashboardScreen() {
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const { state: authState } = useAuth();
  const { vocabulary, state: appState } = useApp();
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(appState.settings.soundEnabled);

  const userRole = authState.user?.role ?? 'student';

  useEffect(() => {
    if (userRole === 'student') {
      ApiService.getActivityStats()
        .then(setActivityStats)
        .catch(() => {});
    }
  }, [userRole]);

  const toggleSound = () => {
    const newMuted = audioManager.toggleMute();
    setSoundEnabled(!newMuted);
  };

  return (
    <SafeAreaView className="flex-1 bg-sky-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-primary-100 px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="bg-primary-100 p-2 rounded-2xl">
              <BookOpen size={24} color={colors.primary[600]} />
            </View>
            <View>
              <Text className="text-xl font-nunito-extrabold text-primary-900">
                Vocab Master
              </Text>
              <View className="bg-primary-50 px-2 py-0.5 rounded-full self-start mt-0.5">
                <Text className="text-xs font-nunito-bold text-primary-600">
                  {vocabulary.length} words
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={toggleSound}
            className="p-3 rounded-full bg-white border-2 border-primary-100 active:bg-primary-50"
          >
            {soundEnabled ? (
              <Volume2 size={20} color={colors.primary[500]} />
            ) : (
              <VolumeX size={20} color={colors.primary[500]} />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerClassName="px-4 pt-4 pb-8 gap-4">
        {/* Greeting */}
        <View className="bg-white rounded-3xl p-6 border border-primary-100">
          <Text className="text-2xl font-nunito-extrabold text-primary-900 mb-1">
            {t('greeting', {
              name: authState.user?.displayName || authState.user?.username,
            })}
          </Text>
          {userRole === 'student' ? (
            <Text className="text-primary-600 font-nunito-semibold">
              {t('readyToLearn')}
            </Text>
          ) : (
            <Text className="text-primary-600 font-nunito-semibold">
              {t('welcomeDashboard')}
            </Text>
          )}
        </View>

        {/* Role-based mode cards */}
        {userRole === 'admin' ? (
          <>
            <ModeCard
              title={t('adminPanel')}
              description={t('adminPanelDesc')}
              icon={Brain}
              color="quiz"
              onPress={() => router.push('/(app)/admin')}
            />
          </>
        ) : userRole === 'parent' ? (
          <>
            <ModeCard
              title={t('parentDashboard')}
              description={t('parentDashboardDesc')}
              icon={Trophy}
              color="challenge"
              onPress={() => router.push('/(app)/parent')}
            />
          </>
        ) : (
          <>
            <ModeCard
              title={t('studyMode')}
              description={t('studyModeDesc')}
              icon={BookOpen}
              color="study"
              onPress={() => router.push('/(app)/study')}
            />
            <ModeCard
              title={t('quizMode')}
              description={t('quizModeDesc')}
              icon={Brain}
              color="quiz"
              onPress={() => router.push('/(app)/quiz')}
            />
            <ModeCard
              title={t('dailyChallenge')}
              description={t('dailyChallengeDesc')}
              icon={Trophy}
              color="challenge"
              onPress={() => router.push('/(app)/challenge')}
            />
          </>
        )}

        {/* Stats summary - Students only */}
        {userRole === 'student' && activityStats && (
          <View className="p-6 bg-white rounded-3xl border-2 border-primary-100/50 mt-4">
            <Text className="text-xs font-nunito-extrabold text-primary-400 uppercase tracking-widest mb-4 text-center">
              {t('yourStats')}
            </Text>
            <View className="flex-row justify-between">
              <StatItem
                icon={Brain}
                value={activityStats.quizCount}
                label={t('statsQuizzes')}
                bgColor="#fce7f3"
                iconColor="#be185d"
              />
              <StatItem
                icon={Trophy}
                value={`${activityStats.avgAccuracy}%`}
                label={t('statsAccuracy')}
                bgColor="#dcfce7"
                iconColor="#16a34a"
              />
              <StatItem
                icon={BookOpen}
                value={activityStats.wordsReviewed}
                label={t('statsReviewed')}
                bgColor="#dbeafe"
                iconColor="#1d4ed8"
              />
              <StatItem
                icon={Flame}
                value={activityStats.currentStreak}
                label={t('statsStreak')}
                bgColor="#fef3c7"
                iconColor="#b45309"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({
  icon: Icon,
  value,
  label,
  bgColor,
  iconColor,
}: {
  icon: ElementType;
  value: number | string;
  label: string;
  bgColor: string;
  iconColor: string;
}) {
  return (
    <View className="items-center">
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-1.5"
        style={{ backgroundColor: bgColor }}
      >
        <Icon size={18} color={iconColor} strokeWidth={3} />
      </View>
      <Text className="text-xl font-nunito-extrabold text-gray-800">{value}</Text>
      <Text className="text-[10px] font-nunito-bold text-gray-500">{label}</Text>
    </View>
  );
}
