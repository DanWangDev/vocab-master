import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Flame, Calendar, Clock, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { AdminUserStats, ParentThresholds } from '../../services/ApiService';
import { formatRelativeTime } from '../../utils/formatters';

interface UserListProps {
    users: AdminUserStats[];
    onSelectUser: (user: AdminUserStats) => void;
    onResetPassword?: (user: AdminUserStats) => void;
    thresholds?: ParentThresholds;
}

function ActivityDot({ status }: { status: 'active' | 'some' | 'inactive' }) {
    const colors = {
        active: 'bg-green-500',
        some: 'bg-amber-500',
        inactive: 'bg-red-400',
    };

    return (
        <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${colors[status]}`}
            title={status}
        />
    );
}

function isOnTrack(user: AdminUserStats, thresholds: ParentThresholds): boolean {
    return user.days_active_this_week >= thresholds.days_per_week;
}

export function UserList({ users, onSelectUser, onResetPassword, thresholds }: UserListProps) {
    const { t, i18n } = useTranslation('parent');

    // Sort by urgency: inactive first, then by last_seen_at ascending
    const sortedUsers = useMemo(() => {
        const statusOrder = { inactive: 0, some: 1, active: 2 };
        return [...users].sort((a, b) => {
            const statusDiff = statusOrder[a.activity_status] - statusOrder[b.activity_status];
            if (statusDiff !== 0) return statusDiff;
            const aTime = a.last_seen_at ? new Date(a.last_seen_at).getTime() : 0;
            const bTime = b.last_seen_at ? new Date(b.last_seen_at).getTime() : 0;
            return aTime - bTime;
        });
    }, [users]);

    if (sortedUsers.length === 0) {
        return <div className="text-center text-gray-500 py-8">{t('noUsersFound')}</div>;
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedUsers.map((user, index) => {
                const onTrack = thresholds ? isOnTrack(user, thresholds) : null;

                return (
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
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-lg group-hover:scale-110 transition-transform">
                                        {user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}
                                    </div>
                                    <span className="absolute -bottom-0.5 -right-0.5">
                                        <ActivityDot status={user.activity_status} />
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">
                                        {user.display_name || user.username}
                                    </h3>
                                    <p className="text-xs text-gray-500">
                                        {(user.last_seen_at || user.last_study_date)
                                            ? formatRelativeTime((user.last_seen_at || user.last_study_date)!, i18n.language)
                                            : t('never')}
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

                        {/* On Track Badge */}
                        {onTrack !== null && (
                            <div className={`mb-3 px-2.5 py-1 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${
                                onTrack
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-amber-50 text-amber-700'
                            }`}>
                                {onTrack ? (
                                    <><CheckCircle2 className="w-3 h-3" /> {t('onTrack')}</>
                                ) : (
                                    <><AlertTriangle className="w-3 h-3" /> {t('belowTarget')}</>
                                )}
                            </div>
                        )}

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
                                <span className={`font-semibold ${user.days_active_this_week > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {user.days_active_this_week > 0
                                        ? t('daysOfSeven', { count: user.days_active_this_week })
                                        : '-'}
                                </span>
                            </div>
                            <div className="col-span-2 flex flex-col gap-1 mt-1 pt-3 border-t border-gray-50">
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {t('lastActive')}
                                </span>
                                <span className="text-sm text-gray-600">
                                    {(user.last_seen_at || user.last_study_date)
                                        ? formatRelativeTime((user.last_seen_at || user.last_study_date)!, i18n.language)
                                        : t('never')}
                                </span>
                            </div>
                        </div>
                    </motion.button>
                );
            })}
        </div>
    );
}
