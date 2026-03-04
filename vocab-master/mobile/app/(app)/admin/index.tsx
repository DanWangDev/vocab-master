import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, Alert,
  RefreshControl, TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import {
  Shield, UserPlus, Edit2, Trash2, Key, X,
  User, Users as UsersIcon, ShieldCheck,
} from 'lucide-react-native';
import { ApiService } from '../../../src/services/ApiService';
import { Button } from '../../../src/components/common';
import { OfflineIndicator } from '../../../src/components/common/OfflineIndicator';
import { colors } from '../../../src/theme/colors';
import type { AdminUserStats } from '../../../src/services/ApiService';

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  student: { bg: 'bg-blue-100', text: 'text-blue-700' },
  parent: { bg: 'bg-green-100', text: 'text-green-700' },
  admin: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export default function AdminScreen() {
  const { t } = useTranslation('admin');
  const [users, setUsers] = useState<AdminUserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserStats | null>(null);
  const [deletingUser, setDeletingUser] = useState<AdminUserStats | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserStats | null>(null);

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

  const handleDelete = useCallback(async (userId: number) => {
    try {
      await ApiService.deleteUser(userId);
      setDeletingUser(null);
      loadUsers();
    } catch {
      Alert.alert(t('error', 'Error'), t('deleteFailed', 'Failed to delete user'));
    }
  }, [loadUsers, t]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-2">
          <Shield size={24} color={colors.primary[600]} />
          <Text className="text-xl font-nunito-bold text-gray-900">
            {t('title', 'Admin Panel')}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAddUser(true)}
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
            <Text className="text-gray-500 font-nunito">{t('loading', 'Loading...')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {users.map((user, index) => {
              const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.student;
              return (
                <Animated.View key={user.id} entering={FadeInDown.delay(index * 60)}>
                  <View className="bg-white rounded-2xl p-4 border border-gray-100">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center">
                          <Text className="text-gray-600 font-nunito-bold text-lg">
                            {(user.display_name || user.username).charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text className="font-nunito-bold text-gray-900">
                            {user.display_name || user.username}
                          </Text>
                          <Text className="text-xs text-gray-400 font-nunito">
                            @{user.username}
                          </Text>
                        </View>
                      </View>
                      <View className={`px-2 py-1 rounded-full ${roleStyle.bg}`}>
                        <Text className={`text-xs font-nunito-bold ${roleStyle.text}`}>
                          {user.role}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between mb-3">
                      <Text className="text-xs text-gray-400 font-nunito">
                        {t('words', 'Words')}: {user.total_words_studied}
                      </Text>
                      <Text className="text-xs text-gray-400 font-nunito">
                        {t('quizzes', 'Quizzes')}: {user.quizzes_taken}
                      </Text>
                      <Text className="text-xs text-gray-400 font-nunito">
                        {t('lastActive', 'Last')}: {formatDate(user.last_seen_at || user.last_study_date)}
                      </Text>
                    </View>

                    <View className="flex-row gap-2">
                      <Pressable
                        onPress={() => setEditingUser(user)}
                        className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-gray-100 rounded-xl"
                      >
                        <Edit2 size={14} color={colors.gray[600]} />
                        <Text className="text-xs font-nunito-bold text-gray-600">
                          {t('edit', 'Edit')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setResetPasswordUser(user)}
                        className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-amber-50 rounded-xl"
                      >
                        <Key size={14} color={colors.warning} />
                        <Text className="text-xs font-nunito-bold text-amber-600">
                          {t('resetPw', 'Reset PW')}
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setDeletingUser(user)}
                        className="flex-1 flex-row items-center justify-center gap-1 py-2 bg-red-50 rounded-xl"
                      >
                        <Trash2 size={14} color={colors.error} />
                        <Text className="text-xs font-nunito-bold text-red-500">
                          {t('delete', 'Delete')}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Add User Modal */}
      <AddUserModal
        visible={showAddUser}
        users={users}
        onClose={() => setShowAddUser(false)}
        onCreated={loadUsers}
      />

      {/* Edit User Modal */}
      <EditUserModal
        user={editingUser}
        users={users}
        onClose={() => setEditingUser(null)}
        onSaved={loadUsers}
      />

      {/* Delete Confirm Modal */}
      {deletingUser && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setDeletingUser(null)}>
          <View className="flex-1 bg-black/50 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center mb-4">
                <View className="w-12 h-12 rounded-full bg-red-100 items-center justify-center mb-3">
                  <Trash2 size={24} color={colors.error} />
                </View>
                <Text className="text-lg font-nunito-bold text-gray-900">
                  {t('confirmDelete', 'Delete User?')}
                </Text>
                <Text className="text-sm text-gray-500 font-nunito text-center mt-2">
                  {t('deleteWarning', 'This will permanently delete {{name}} and all their data.', {
                    name: deletingUser.display_name || deletingUser.username,
                  })}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setDeletingUser(null)}
                  className="flex-1 py-3 items-center bg-gray-100 rounded-xl"
                >
                  <Text className="font-nunito-bold text-gray-600">{t('cancel', 'Cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(deletingUser.id)}
                  className="flex-1 py-3 items-center bg-red-500 rounded-xl"
                >
                  <Text className="font-nunito-bold text-white">{t('delete', 'Delete')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={resetPasswordUser}
        onClose={() => setResetPasswordUser(null)}
      />
    </SafeAreaView>
  );
}

function AddUserModal({
  visible,
  users,
  onClose,
  onCreated,
}: {
  visible: boolean;
  users: AdminUserStats[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'parent' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parents = users.filter(u => u.role === 'parent');

  const handleCreate = async () => {
    if (!username || !password) {
      setError(t('requiredFields', 'Username and password are required'));
      return;
    }
    if (role === 'parent' && !email) {
      setError(t('emailRequired', 'Email is required for parent accounts'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await ApiService.createUser({
        username,
        password,
        role,
        parentId: role === 'student' ? parentId : null,
        email: role !== 'student' ? email : undefined,
      });
      onCreated();
      onClose();
      setUsername('');
      setPassword('');
      setRole('student');
      setEmail('');
      setParentId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('createFailed', 'Failed to create user'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Text className="text-lg font-nunito-bold text-gray-900">
            {t('addUser', 'Add User')}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={colors.gray[600]} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {error !== '' && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-700 font-nunito text-sm">{error}</Text>
            </View>
          )}

          {/* Role Selection */}
          <Text className="text-sm font-nunito-bold text-gray-600 mb-2">
            {t('role', 'Role')}
          </Text>
          <View className="flex-row gap-2 mb-4">
            {(['student', 'parent', 'admin'] as const).map(r => {
              const Icon = r === 'student' ? User : r === 'parent' ? UsersIcon : ShieldCheck;
              const isActive = role === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  className={`flex-1 flex-row items-center justify-center gap-1 py-3 rounded-xl border-2 ${
                    isActive ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Icon size={16} color={isActive ? colors.primary[600] : colors.gray[400]} />
                  <Text
                    className={`text-sm font-nunito-bold ${
                      isActive ? 'text-primary-600' : 'text-gray-500'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text className="text-sm font-nunito-bold text-gray-600 mb-1">
            {t('username', 'Username')}
          </Text>
          <RNTextInput
            value={username}
            onChangeText={setUsername}
            placeholder={t('usernamePlaceholder', 'Enter username')}
            autoCapitalize="none"
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-nunito"
          />

          <Text className="text-sm font-nunito-bold text-gray-600 mb-1">
            {t('password', 'Password')}
          </Text>
          <RNTextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('passwordPlaceholder', 'Enter password')}
            secureTextEntry
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-nunito"
          />

          {role !== 'student' && (
            <>
              <Text className="text-sm font-nunito-bold text-gray-600 mb-1">
                {t('email', 'Email')}
              </Text>
              <RNTextInput
                value={email}
                onChangeText={setEmail}
                placeholder={t('emailPlaceholder', 'Enter email')}
                keyboardType="email-address"
                autoCapitalize="none"
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-nunito"
              />
            </>
          )}

          {role === 'student' && parents.length > 0 && (
            <>
              <Text className="text-sm font-nunito-bold text-gray-600 mb-2">
                {t('assignParent', 'Assign Parent (optional)')}
              </Text>
              <View className="gap-2 mb-4">
                <Pressable
                  onPress={() => setParentId(null)}
                  className={`py-3 px-4 rounded-xl border-2 ${
                    parentId === null ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text className={`font-nunito ${parentId === null ? 'text-primary-600 font-nunito-bold' : 'text-gray-500'}`}>
                    {t('noParent', 'No parent')}
                  </Text>
                </Pressable>
                {parents.map(p => (
                  <Pressable
                    key={p.id}
                    onPress={() => setParentId(p.id)}
                    className={`py-3 px-4 rounded-xl border-2 ${
                      parentId === p.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <Text className={`font-nunito ${parentId === p.id ? 'text-primary-600 font-nunito-bold' : 'text-gray-500'}`}>
                      {p.display_name || p.username}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Button onPress={handleCreate} color={colors.primary[600]} disabled={loading}>
            <Text className="text-white font-nunito-bold text-base text-center">
              {loading ? t('creating', 'Creating...') : t('createUser', 'Create User')}
            </Text>
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EditUserModal({
  user,
  users,
  onClose,
  onSaved,
}: {
  user: AdminUserStats | null;
  users: AdminUserStats[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('admin');
  const [role, setRole] = useState<'student' | 'parent' | 'admin'>('student');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role);
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      if (role !== user.role) {
        await ApiService.updateUserRole(user.id, role);
      }
      onSaved();
      onClose();
    } catch {
      Alert.alert(t('error', 'Error'), t('saveFailed', 'Failed to save changes'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Text className="text-lg font-nunito-bold text-gray-900">
            {t('editUser', 'Edit User')}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={colors.gray[600]} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-sm text-gray-400 font-nunito mb-1">{t('username', 'Username')}</Text>
            <Text className="text-lg font-nunito-bold text-gray-900">@{user.username}</Text>
          </View>

          <Text className="text-sm font-nunito-bold text-gray-600 mb-2">
            {t('changeRole', 'Change Role')}
          </Text>
          <View className="gap-2 mb-6">
            {(['student', 'parent', 'admin'] as const).map(r => (
              <Pressable
                key={r}
                onPress={() => setRole(r)}
                className={`py-3 px-4 rounded-xl border-2 ${
                  role === r ? 'border-primary-500 bg-primary-50' : 'border-gray-200 bg-white'
                }`}
              >
                <Text className={`font-nunito ${role === r ? 'text-primary-600 font-nunito-bold' : 'text-gray-500'}`}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Button onPress={handleSave} color={colors.primary[600]} disabled={loading}>
            <Text className="text-white font-nunito-bold text-base text-center">
              {loading ? t('saving', 'Saving...') : t('save', 'Save Changes')}
            </Text>
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ResetPasswordModal({
  user,
  onClose,
}: {
  user: AdminUserStats | null;
  onClose: () => void;
}) {
  const { t } = useTranslation('admin');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user) return null;

  const handleReset = async () => {
    if (password.length < 6) {
      setError(t('passwordMin', 'Password must be at least 6 characters'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch', 'Passwords do not match'));
      return;
    }

    setLoading(true);
    setError('');
    try {
      await ApiService.resetUserPassword(user.id, password);
      Alert.alert(t('success', 'Success'), t('passwordReset', 'Password has been reset'));
      onClose();
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError(t('resetFailed', 'Failed to reset password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 items-center justify-center p-6">
        <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
          <View className="items-center mb-4">
            <View className="w-12 h-12 rounded-full bg-amber-100 items-center justify-center mb-3">
              <Key size={24} color={colors.warning} />
            </View>
            <Text className="text-lg font-nunito-bold text-gray-900">
              {t('resetPasswordFor', 'Reset Password')}
            </Text>
            <Text className="text-sm text-gray-500 font-nunito mt-1">
              @{user.username}
            </Text>
          </View>

          {error !== '' && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3">
              <Text className="text-red-700 font-nunito text-sm">{error}</Text>
            </View>
          )}

          <RNTextInput
            value={password}
            onChangeText={setPassword}
            placeholder={t('newPassword', 'New password')}
            secureTextEntry
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-3 font-nunito"
          />
          <RNTextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('confirmPassword', 'Confirm password')}
            secureTextEntry
            className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 font-nunito"
          />

          <View className="flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 py-3 items-center bg-gray-100 rounded-xl"
            >
              <Text className="font-nunito-bold text-gray-600">{t('cancel', 'Cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleReset}
              disabled={loading}
              className="flex-1 py-3 items-center bg-amber-500 rounded-xl"
            >
              <Text className="font-nunito-bold text-white">
                {loading ? '...' : t('reset', 'Reset')}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
