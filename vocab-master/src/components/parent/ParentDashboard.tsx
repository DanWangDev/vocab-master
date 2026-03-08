import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, LayoutDashboard, UserPlus, Plus, X, Clock, Loader2, Pencil } from 'lucide-react';
import { Button } from '../common';
import { UserList } from './UserList';
import { UserDetailModal } from './UserDetailModal';
import { ThresholdSettings } from './ThresholdSettings';
import { ResetStudentPasswordModal } from '../admin/ResetStudentPasswordModal';
import { StudentSearchModal } from '../linking/StudentSearchModal';
import { CreateStudentModal } from './CreateStudentModal';
import { NotificationBell } from '../notifications/NotificationBell';
import { CompleteProfileModal } from '../auth/CompleteProfileModal';
import { ApiService, type AdminUserStats, type ParentThresholds } from '../../services/ApiService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';

export function ParentDashboard() {
    const { t } = useTranslation('parent');
    const { state, logout, updateProfile, clearNewGoogleUser } = useAuth();
    const navigate = useNavigate();
    const { linkRequests, cancelLinkRequest, refreshAll } = useNotifications();
    const [users, setUsers] = useState<AdminUserStats[]>([]);
    const [selectedUser, setSelectedUser] = useState<AdminUserStats | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserStats | null>(null);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [cancellingId, setCancellingId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [thresholds, setThresholds] = useState<ParentThresholds>({ days_per_week: 5, minutes_per_day: 20 });

    // Load users and thresholds on mount
    useEffect(() => {
        loadUsers();
        ApiService.getThresholds()
            .then(setThresholds)
            .catch(() => { /* use defaults */ });
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await ApiService.getAdminUsers();
            setUsers(data);
        } catch (err) {
            console.error('Failed to load users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleBack = () => {
        navigate('/');
    };

    const handleLinkSuccess = () => {
        refreshAll();
        loadUsers();
    };

    const handleCancelRequest = async (id: number) => {
        setCancellingId(id);
        try {
            await cancelLinkRequest(id);
        } finally {
            setCancellingId(null);
        }
    };

    const handleProfileSave = async (data: { username?: string; displayName?: string }) => {
        await updateProfile(data);
    };

    const handleProfileModalClose = () => {
        if (state.isNewGoogleUser) {
            clearNewGoogleUser();
        }
        setShowEditProfile(false);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-purple-600" />
                        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
                        {state.user && (
                            <button
                                onClick={() => setShowEditProfile(true)}
                                className="ml-2 flex items-center gap-1 text-sm text-gray-500 hover:text-purple-600 transition-colors"
                                title={t('editProfile')}
                            >
                                <span className="text-gray-600 font-medium">
                                    {state.user.displayName || state.user.username}
                                </span>
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <Button variant="ghost" onClick={handleLogout} className="text-sm">
                            <LogOut className="w-4 h-4" />
                            {t('logOut')}
                        </Button>
                        <Button variant="outline" onClick={handleBack}>
                            {t('exitToApp')}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="mb-8 flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{t('studentOverview')}</h2>
                            <p className="text-gray-500">{t('studentOverviewDesc')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThresholdSettings onUpdate={setThresholds} />
                            <Button
                                onClick={() => setShowCreateModal(true)}
                                className="flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {t('createStudent')}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setShowLinkModal(true)}
                                className="flex items-center gap-2"
                            >
                                <UserPlus className="w-4 h-4" />
                                {t('linkStudent')}
                            </Button>
                        </div>
                    </div>

                    {/* Pending Link Requests */}
                    {linkRequests.length > 0 && (
                        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                            <h3 className="text-sm font-semibold text-yellow-800 mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {t('pendingLinkRequests')}
                            </h3>
                            <div className="space-y-2">
                                {linkRequests.map(request => (
                                    <div
                                        key={request.id}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-yellow-100"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900">
                                                {request.studentDisplayName || request.studentUsername}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                @{request.studentUsername}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleCancelRequest(request.id)}
                                            disabled={cancellingId === request.id}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {cancellingId === request.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <X className="w-4 h-4" />
                                            )}
                                            {t('cancelRequest')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : (
                        <UserList
                            users={users}
                            onSelectUser={setSelectedUser}
                            onResetPassword={setResetPasswordUser}
                            thresholds={thresholds}
                        />
                    )}
                </motion.div>
            </main>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedUser && (
                    <UserDetailModal
                        user={{ id: selectedUser.id, name: selectedUser.display_name || selectedUser.username }}
                        onClose={() => setSelectedUser(null)}
                    />
                )}
            </AnimatePresence>

            {/* Reset Password Modal */}
            <AnimatePresence>
                {resetPasswordUser && (
                    <ResetStudentPasswordModal
                        userId={resetPasswordUser.id}
                        userName={resetPasswordUser.display_name || resetPasswordUser.username}
                        onClose={() => setResetPasswordUser(null)}
                    />
                )}
            </AnimatePresence>

            {/* Create Student Modal */}
            <CreateStudentModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleLinkSuccess}
            />

            {/* Link Student Modal */}
            <StudentSearchModal
                isOpen={showLinkModal}
                onClose={() => setShowLinkModal(false)}
                onSuccess={handleLinkSuccess}
            />

            {/* Profile Completion / Edit Modal */}
            <AnimatePresence>
                {(state.isNewGoogleUser || showEditProfile) && state.user && (
                    <CompleteProfileModal
                        mode={state.isNewGoogleUser ? 'complete' : 'edit'}
                        currentUsername={state.user.username}
                        currentDisplayName={state.user.displayName}
                        onSave={handleProfileSave}
                        onClose={handleProfileModalClose}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
