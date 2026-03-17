import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Save, Shield, User, GraduationCap, Mail } from 'lucide-react';
import { Button } from '../common';
import { ApiService, type AdminUserStats } from '../../services/ApiService';

interface EditUserModalProps {
    user: AdminUserStats;
    allUsers: AdminUserStats[];
    onClose: () => void;
    onSave: () => void;
}

export function EditUserModal({ user, allUsers, onClose, onSave }: EditUserModalProps) {
    const { t } = useTranslation('admin');
    const [role, setRole] = useState<'student' | 'parent' | 'admin'>(user.role);
    const [parentId, setParentId] = useState<number | null>(user.parent_id);
    const [email, setEmail] = useState(user.email || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parents = allUsers.filter(u => u.role === 'parent');

    const handleSave = async () => {
        // Validate email if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t('validation.emailInvalid'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            if (role !== user.role) {
                await ApiService.updateUserRole(user.id, role);
            }
            if (parentId !== user.parent_id) {
                await ApiService.updateUserParent(user.id, parentId);
            }
            // Update email if changed (for parent/admin roles)
            const emailChanged = (email || null) !== (user.email || null);
            if (emailChanged && (role === 'parent' || role === 'admin')) {
                await ApiService.updateUserEmail(user.id, email || null);
            }
            onSave();
            onClose();
        } catch (err) {
            console.error('Failed to update user', err);
            setError(err instanceof Error ? err.message : 'Failed to update user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">{t('editUser')}</h2>
                    <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.username')}</label>
                        <div className="text-gray-900 font-semibold">{user.username}</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.role')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['student', 'parent', 'admin'] as const).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => {
                                        setRole(r);
                                        if (r !== 'student') setParentId(null);
                                    }}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium flex flex-col items-center gap-1 border transition-colors ${role === r
                                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-1 ring-indigo-200'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    {r === 'admin' && <Shield className="w-4 h-4" />}
                                    {r === 'parent' && <User className="w-4 h-4" />}
                                    {r === 'student' && <GraduationCap className="w-4 h-4" />}
                                    <span className="capitalize">{r}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {(role === 'parent' || role === 'admin') && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <span className="flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    {t('form.emailAddress')}
                                </span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError(null);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder={t('placeholder.emailEdit')}
                            />
                            <p className="text-xs text-gray-500 mt-1">{t('hint.emailRequired')}</p>
                        </div>
                    )}

                    {role === 'student' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">{t('form.assignedParent')}</label>
                            <select
                                value={parentId || ''}
                                onChange={(e) => setParentId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                                <option value="">{t('noParentAssigned')}</option>
                                {parents.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.display_name || p.username}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">{t('hint.parentAccess')}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-gray-50 flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave} disabled={loading}>
                        {loading ? t('saving') : t('saveChanges')}
                        {!loading && <Save className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
