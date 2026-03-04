import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Modal, Alert, RefreshControl, TextInput as RNTextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Users,
  UserPlus,
  Flame,
  Target,
  BookOpen,
  Clock,
  ChevronRight,
  X,
  Search,
} from 'lucide-react-native';
import { ApiService } from '../../../src/services/ApiService';
import { Button } from '../../../src/components/common';
import { OfflineIndicator } from '../../../src/components/common/OfflineIndicator';
import { colors } from '../../../src/theme/colors';
import type { AdminUserStats, AdminUserDetails, StudentSearchResult } from '../../../src/services/ApiService';

export default function ParentDashboardScreen() {
  const { t } = useTranslation('parent');
  const [users, setUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserStats | null>(null);
  const [userDetails, setUserDetails] = useState<AdminUserDetails | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      const data = await ApiService.getAdminUsers();
      setUsers(data);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, [loadUsers]);

  const openUserDetail = useCallback(async (user: AdminUserStats) => {
    setSelectedUser(user);
    try {
      const details = await ApiService.getAdminUserDetails(user.id);
      setUserDetails(details);
    } catch {
      setUserDetails(null);
    }
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return t('never', 'Never');
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('today', 'Today');
    if (diffDays === 1) return t('yesterday', 'Yesterday');
    if (diffDays < 7) return t('daysAgo', '{{count}}d ago', { count: diffDays });
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-2">
          <Users size={24} color={colors.primary[600]} />
          <Text className="text-xl font-nunito-bold text-gray-900">
            {t('title', 'Parent Dashboard')}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowLinkModal(true)}
          className="w-10 h-10 items-center justify-center rounded-full bg-primary-100"
        >
          <UserPlus size={20} color={colors.primary[600]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View className="items-center py-12">
            <Text className="text-gray-500 font-nunito">
              {t('loading', 'Loading...')}
            </Text>
          </View>
        ) : users.length === 0 ? (
          <Animated.View entering={FadeIn} className="items-center py-12">
            <Users size={48} color={colors.gray[300]} />
            <Text className="text-gray-500 font-nunito-bold mt-4 mb-2">
              {t('noStudents', 'No Linked Students')}
            </Text>
            <Text className="text-gray-400 font-nunito text-center mb-6">
              {t('noStudentsDescription', 'Link a student to monitor their progress')}
            </Text>
            <Button onPress={() => setShowLinkModal(true)} color={colors.primary[600]}>
              <View className="flex-row items-center gap-2">
                <UserPlus size={18} color="white" />
                <Text className="text-white font-nunito-bold">
                  {t('linkStudent', 'Link Student')}
                </Text>
              </View>
            </Button>
          </Animated.View>
        ) : (
          <View className="gap-3">
            {users.map((user, index) => (
              <Animated.View key={user.id} entering={FadeInDown.delay(index * 80)}>
                <Pressable
                  onPress={() => openUserDetail(user)}
                  className="bg-white rounded-2xl p-4 border border-gray-100"
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-full bg-primary-100 items-center justify-center">
                        <Text className="text-primary-600 font-nunito-bold text-lg">
                          {(user.display_name || user.username).charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text className="font-nunito-bold text-gray-900">
                          {user.display_name || user.username}
                        </Text>
                        <Text className="text-xs text-gray-400 font-nunito">
                          {t('lastActive', 'Last active')}: {formatDate(user.last_seen_at || user.last_study_date)}
                        </Text>
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.gray[400]} />
                  </View>

                  <View className="flex-row gap-2">
                    <View className="flex-1 items-center p-2 bg-orange-50 rounded-xl">
                      <Flame size={14} color={colors.challenge.DEFAULT} />
                      <Text className="font-nunito-bold text-sm text-orange-600 mt-1">
                        {user.current_streak}
                      </Text>
                      <Text className="text-[10px] text-orange-400 font-nunito">
                        {t('streak', 'Streak')}
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-2 bg-pink-50 rounded-xl">
                      <Target size={14} color={colors.quiz.DEFAULT} />
                      <Text className="font-nunito-bold text-sm text-pink-600 mt-1">
                        {user.avg_accuracy != null ? `${Math.round(user.avg_accuracy)}%` : '--'}
                      </Text>
                      <Text className="text-[10px] text-pink-400 font-nunito">
                        {t('accuracy', 'Accuracy')}
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-2 bg-blue-50 rounded-xl">
                      <BookOpen size={14} color={colors.study.DEFAULT} />
                      <Text className="font-nunito-bold text-sm text-blue-600 mt-1">
                        {user.total_words_studied}
                      </Text>
                      <Text className="text-[10px] text-blue-400 font-nunito">
                        {t('words', 'Words')}
                      </Text>
                    </View>
                    <View className="flex-1 items-center p-2 bg-gray-50 rounded-xl">
                      <Clock size={14} color={colors.gray[500]} />
                      <Text className="font-nunito-bold text-sm text-gray-600 mt-1">
                        {user.sessions_this_week}
                      </Text>
                      <Text className="text-[10px] text-gray-400 font-nunito">
                        {t('thisWeek', 'This Week')}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Student Detail Modal */}
      <StudentDetailModal
        user={selectedUser}
        details={userDetails}
        onClose={() => {
          setSelectedUser(null);
          setUserDetails(null);
        }}
      />

      {/* Link Student Modal */}
      <LinkStudentModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onLinked={loadUsers}
      />
    </SafeAreaView>
  );
}

function StudentDetailModal({
  user,
  details,
  onClose,
}: {
  user: AdminUserStats | null;
  details: AdminUserDetails | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('parent');

  if (!user) return null;

  const weakWords = (details?.weakWords || []) as Array<{
    word: string;
    incorrect_count: number;
    total_attempts: number;
  }>;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Text className="text-lg font-nunito-bold text-gray-900">
            {user.display_name || user.username}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={colors.gray[600]} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Stats Grid */}
          <View className="flex-row flex-wrap gap-3 mb-6">
            <View className="flex-1 min-w-[45%] p-4 bg-white rounded-2xl">
              <Text className="text-xs text-gray-400 font-nunito mb-1">
                {t('quizzesTaken', 'Quizzes')}
              </Text>
              <Text className="text-2xl font-nunito-bold text-gray-900">
                {user.quizzes_taken}
              </Text>
            </View>
            <View className="flex-1 min-w-[45%] p-4 bg-white rounded-2xl">
              <Text className="text-xs text-gray-400 font-nunito mb-1">
                {t('avgAccuracy', 'Avg Accuracy')}
              </Text>
              <Text className="text-2xl font-nunito-bold text-gray-900">
                {user.avg_accuracy != null ? `${Math.round(user.avg_accuracy)}%` : '--'}
              </Text>
            </View>
            <View className="flex-1 min-w-[45%] p-4 bg-white rounded-2xl">
              <Text className="text-xs text-gray-400 font-nunito mb-1">
                {t('wordsStudied', 'Words Studied')}
              </Text>
              <Text className="text-2xl font-nunito-bold text-gray-900">
                {user.total_words_studied}
              </Text>
            </View>
            <View className="flex-1 min-w-[45%] p-4 bg-white rounded-2xl">
              <Text className="text-xs text-gray-400 font-nunito mb-1">
                {t('currentStreak', 'Streak')}
              </Text>
              <Text className="text-2xl font-nunito-bold text-gray-900">
                {user.current_streak} {t('days', 'days')}
              </Text>
            </View>
          </View>

          {/* Weak Words */}
          {weakWords.length > 0 && (
            <View className="mb-6">
              <Text className="text-sm font-nunito-bold text-gray-500 uppercase tracking-wide mb-3">
                {t('weakWords', 'Words to Review')}
              </Text>
              {weakWords.slice(0, 10).map((w, i) => {
                const errorRate = w.total_attempts > 0
                  ? Math.round((w.incorrect_count / w.total_attempts) * 100)
                  : 0;
                return (
                  <View key={i} className="flex-row items-center justify-between py-3 border-b border-gray-100">
                    <Text className="font-nunito-bold text-gray-800">{w.word}</Text>
                    <View className="flex-row items-center gap-2">
                      <View className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <View
                          className="h-full bg-red-400 rounded-full"
                          style={{ width: `${errorRate}%` }}
                        />
                      </View>
                      <Text className="text-xs font-nunito text-red-500 w-10 text-right">
                        {errorRate}%
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function LinkStudentModal({
  visible,
  onClose,
  onLinked,
}: {
  visible: boolean;
  onClose: () => void;
  onLinked: () => void;
}) {
  const { t } = useTranslation('parent');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState<number | null>(null);

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const data = await ApiService.searchStudents(q);
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const sendRequest = useCallback(async (studentId: number) => {
    setSending(studentId);
    try {
      await ApiService.sendLinkRequest(studentId);
      Alert.alert(
        t('requestSent', 'Request Sent'),
        t('requestSentDescription', 'The student will receive a notification')
      );
      onLinked();
      onClose();
    } catch {
      Alert.alert(t('error', 'Error'), t('requestFailed', 'Failed to send request'));
    } finally {
      setSending(null);
    }
  }, [onLinked, onClose, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Text className="text-lg font-nunito-bold text-gray-900">
            {t('linkStudent', 'Link Student')}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={colors.gray[600]} />
          </Pressable>
        </View>

        <View className="p-4">
          <View className="flex-row items-center bg-white rounded-xl border border-gray-200 px-3">
            <Search size={18} color={colors.gray[400]} />
            <RNTextInput
              value={query}
              onChangeText={search}
              placeholder={t('searchPlaceholder', 'Search by username...')}
              autoCapitalize="none"
              autoFocus
              className="flex-1 py-3 px-2 font-nunito"
            />
          </View>

          {results.map((student) => (
            <View
              key={student.id}
              className="flex-row items-center justify-between bg-white p-4 rounded-xl mt-2"
            >
              <View>
                <Text className="font-nunito-bold text-gray-900">{student.username}</Text>
                {student.displayName && (
                  <Text className="text-sm text-gray-500 font-nunito">{student.displayName}</Text>
                )}
              </View>
              {student.status === 'pending' ? (
                <Text className="text-xs text-amber-600 font-nunito-bold">
                  {t('pending', 'Pending')}
                </Text>
              ) : (
                <Pressable
                  onPress={() => sendRequest(student.id)}
                  disabled={sending === student.id}
                  className="px-4 py-2 bg-primary-500 rounded-xl"
                >
                  <Text className="text-white font-nunito-bold text-sm">
                    {sending === student.id ? '...' : t('link', 'Link')}
                  </Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
}
