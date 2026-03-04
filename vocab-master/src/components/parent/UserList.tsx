import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BookOpen, Trophy, Clock, Flame, Calendar, KeyRound } from 'lucide-react';
import type { AdminUserStats } from '../../services/ApiService';
import { formatDate } from '../../utils/formatters';

interface UserListProps {
    users: AdminUserStats[];
    onSelectUser: (user: AdminUserStats) => void;
    onResetPassword?: (user: AdminUserStats) => void;
}

export function UserList({ users, onSelectUser, onResetPassword }: UserListProps) {
    const { t, i18n } = useTranslation('parent');

    if (users.length === 0) {
        return <div className="text-center text-gray-500 py-8">{t('noUsersFound')}</div>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user, index) => (
                <motion.button
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => onSelectUser(user)}
                    className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all text-left group border border-gray-100 hover:border-purple-200"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:scale-110 transition-transform">
                                {user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">
                                    {user.display_name || user.username}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {t('joined', { date: formatDate(user.created_at, i18n.language) })}
                                </p>
                            </div>
                        </div>
                        {onResetPassword && user.role === 'student' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onResetPassword(user);
                                }}
                                className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title={t('resetPassword')}
                            >
                                <KeyRound className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Flame className="w-3 h-3" /> {t('streak')}
                            </span>
                            <span className={`font-semibold ${user.current_streak > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                                {user.current_streak > 0 ? t('days', { count: user.current_streak }) : '-'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {t('thisWeek')}
                            </span>
                            <span className={`font-semibold ${user.sessions_this_week > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                {user.sessions_this_week > 0 ? t('sessions', { count: user.sessions_this_week }) : '-'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Trophy className="w-3 h-3" /> {t('accuracy')}
                            </span>
                            <span className="font-semibold text-gray-700">
                                {user.avg_accuracy ? `${Math.round(user.avg_accuracy)}%` : '-'}
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> {t('studied')}
                            </span>
                            <span className="font-semibold text-gray-700">
                                {t('wordsStudied', { count: user.total_words_studied })}
                            </span>
                        </div>
                        <div className="col-span-2 flex flex-col gap-1 mt-1 pt-3 border-t border-gray-50">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {t('lastActive')}
                            </span>
                            <span className="text-sm text-gray-600">
                                {(user.last_seen_at || user.last_study_date)
                                    ? formatDate((user.last_seen_at || user.last_study_date)!, i18n.language)
                                    : t('never')}
                            </span>
                        </div>
                    </div>
                </motion.button>
            ))}
        </div>
    );
}
