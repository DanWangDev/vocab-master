import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Shield, Plus, Edit, Trash2, LogOut, KeyRound } from 'lucide-react';
import { Button } from '../common';
import { ApiService, type AdminUserStats } from '../../services/ApiService';
import { useAuth } from '../../contexts/AuthContext';
import { EditUserModal } from './EditUserModal';
import { AddUserModal } from './AddUserModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ResetStudentPasswordModal } from './ResetStudentPasswordModal';
import { formatDate } from '../../utils/formatters';

export function AdminPanel() {
    const { t, i18n } = useTranslation('admin');
    const { logout } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState<AdminUserStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<AdminUserStats | null>(null);
    const [showAddUser, setShowAddUser] = useState(false);
    const [deletingUser, setDeletingUser] = useState<AdminUserStats | null>(null);
    const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserStats | null>(null);

    useEffect(() => {
        loadUsers();
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

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        await ApiService.deleteUser(deletingUser.id);
        await loadUsers();
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
                    </div>
                    <div className="flex items-center gap-4">
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{t('userManagement')}</h2>
                        <p className="text-gray-500">{t('userManagementDesc')}</p>
                    </div>
                    <Button variant="primary" onClick={() => setShowAddUser(true)}>
                        <Plus className="w-4 h-4" />
                        {t('newUser')}
                    </Button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.user')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.role')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.stats')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.lastActive')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                                                    {user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">{user.display_name || user.username}</div>
                                                    <div className="text-sm text-gray-500">@{user.username}</div>
                                                    {user.email && (
                                                        <div className="text-xs text-gray-400">{user.email}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                                                ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                                                    user.role === 'parent' ? 'bg-purple-100 text-purple-800' :
                                                        'bg-green-100 text-green-800'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{t('table.wordsStudied', { count: user.total_words_studied })}</div>
                                            <div className="text-sm text-gray-500">{t('table.quizzesTaken', { count: user.quizzes_taken })}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {(user.last_seen_at || user.last_study_date) ? formatDate((user.last_seen_at || user.last_study_date)!, i18n.language) : t('table.never')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => setEditingUser(user)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                                                title={t('editUser')}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setResetPasswordUser(user)}
                                                className="text-amber-600 hover:text-amber-900 mr-3"
                                                title={t('resetPassword')}
                                            >
                                                <KeyRound className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeletingUser(user)}
                                                className="text-red-600 hover:text-red-900 cursor-pointer"
                                                title={t('deleteUser')}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>

            {/* Edit Modal */}
            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    allUsers={users}
                    onClose={() => setEditingUser(null)}
                    onSave={loadUsers}
                />
            )}

            {/* Add User Modal */}
            {showAddUser && (
                <AddUserModal
                    allUsers={users}
                    onClose={() => setShowAddUser(false)}
                    onSave={loadUsers}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingUser && (
                <DeleteConfirmModal
                    userName={deletingUser.display_name || deletingUser.username}
                    userRole={deletingUser.role}
                    onConfirm={handleDeleteUser}
                    onClose={() => setDeletingUser(null)}
                />
            )}

            {/* Reset Password Modal */}
            {resetPasswordUser && (
                <ResetStudentPasswordModal
                    userId={resetPasswordUser.id}
                    userName={resetPasswordUser.display_name || resetPasswordUser.username}
                    onClose={() => setResetPasswordUser(null)}
                />
            )}
        </div>
    );
}
