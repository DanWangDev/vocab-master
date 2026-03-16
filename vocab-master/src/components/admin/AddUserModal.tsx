import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Save, Shield, User, GraduationCap, Mail } from 'lucide-react';
import { Button } from '../common';
import { ApiService, type AdminUserStats } from '../../services/ApiService';

interface AddUserModalProps {
    allUsers: AdminUserStats[];
    onClose: () => void;
    onSave: () => void;
}

export function AddUserModal({ allUsers, onClose, onSave }: AddUserModalProps) {
    const { t } = useTranslation('admin');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<'student' | 'parent' | 'admin'>('student');
    const [parentId, setParentId] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const parents = allUsers.filter(u => u.role === 'parent');

    const handleSave = async () => {
        if (!username || !password) {
            setError(t('validation.usernamePasswordRequired'));
            return;
        }

        if (role === 'parent' && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError(t('validation.emailInvalid'));
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await ApiService.createUser({
                username,
                password,
                role,
                parentId,
                email: role === 'parent' && email ? email : undefined
            });
            onSave();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to create user');
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
                    <h2 className="text-xl font-bold text-gray-900">{t('addNewUser')}</h2>
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
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder={t('placeholder.username')}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('form.password')}</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder={t('placeholder.password')}
                        />
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
                                        if (r !== 'parent') setEmail('');
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

                    {role === 'parent' && (
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
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                placeholder={t('placeholder.email')}
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
                        {loading ? t('creating') : t('createUser')}
                        {!loading && <Save className="w-4 h-4 ml-2" />}
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
