import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, Calendar, Activity, BookOpen, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Button, Card } from '../common';
import { TrendChart } from './TrendChart';
import { WeakWordsTable } from './WeakWordsTable';
import { ApiService, type AdminUserDetails } from '../../services/ApiService';
interface UserDetailModalProps {
    user: { id: number; name: string };
    onClose: () => void;
}

export function UserDetailModal({ user, onClose }: UserDetailModalProps) {
    const { t } = useTranslation('parent');
    const [details, setDetails] = useState<AdminUserDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const data = await ApiService.getAdminUserDetails(user.id);
                setDetails(data);
            } catch {
                // Error already logged by ApiService
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [user.id]);

    if (!user) return null;

    const hasQuizData = details && details.quizHistory.length > 0;
    const avgAccuracy = hasQuizData
        ? Math.round(
            details.quizHistory.reduce((acc, curr) => acc + (curr.accuracy || 0), 0) /
            details.quizHistory.length
        )
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{t('progress', { name: user.name })}</h2>
                        <p className="text-sm text-gray-500">{t('detailedReport')}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
                    ) : details ? (
                        <div className="space-y-6">
                            {/* This Week Summary */}
                            <Card variant="default" padding="md">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">{t('thisWeekSummary')}</h3>
                                <p className="text-gray-600">
                                    {t('weeklySummaryNarrative', {
                                        name: user.name,
                                        daysActive: details.summary.days_active_this_week,
                                        timeMinutes: details.summary.total_time_this_week_minutes,
                                    })}
                                </p>
                            </Card>

                            {/* Weekly Comparison */}
                            <Card variant="default" padding="md">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('weeklyProgress')}</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <WeeklyComparisonItem
                                        label={t('daysActive')}
                                        thisWeek={details.weeklyComparison.this_week.days_active}
                                        lastWeek={details.weeklyComparison.last_week.days_active}
                                    />
                                    <WeeklyComparisonItem
                                        label={t('quizzes')}
                                        thisWeek={details.weeklyComparison.this_week.quizzes}
                                        lastWeek={details.weeklyComparison.last_week.quizzes}
                                    />
                                    <WeeklyComparisonItem
                                        label={t('studySessions')}
                                        thisWeek={details.weeklyComparison.this_week.sessions}
                                        lastWeek={details.weeklyComparison.last_week.sessions}
                                    />
                                    <WeeklyComparisonItem
                                        label={t('timeSpent')}
                                        thisWeek={details.weeklyComparison.this_week.time_minutes}
                                        lastWeek={details.weeklyComparison.last_week.time_minutes}
                                        suffix={t('minutesShort')}
                                    />
                                </div>
                            </Card>

                            {/* Weak Words - Promoted up */}
                            <Card variant="default" padding="md">
                                <WeakWordsTable words={details.weakWords} />
                            </Card>

                            {/* Graphical Analysis */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card variant="default" padding="md">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('quizAccuracyTrend')}</h3>
                                    <TrendChart
                                        data={details.quizHistory.slice().reverse()}
                                        dataKey="accuracy"
                                        xAxisKey="completed_at"
                                        name={t('accuracyPercent')}
                                        color="#8884d8"
                                    />
                                </Card>

                                <Card variant="default" padding="md">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('dailyStudyEffort')}</h3>
                                    <TrendChart
                                        data={details.studyHistory.slice().reverse()}
                                        dataKey="words_reviewed"
                                        xAxisKey="start_time"
                                        name={t('wordsReviewed')}
                                        color="#82ca9d"
                                        aggregateByDay={true}
                                        chartType="bar"
                                    />
                                </Card>
                            </div>

                            {/* Stats Cards - De-emphasized at bottom */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatusCard
                                    icon={BookOpen}
                                    label={t('totalQuizzes')}
                                    value={details.quizHistory.length.toString()}
                                    color="text-blue-600"
                                    bg="bg-blue-50"
                                />
                                <StatusCard
                                    icon={Activity}
                                    label={t('avgAccuracy')}
                                    value={avgAccuracy !== null ? `${avgAccuracy}%` : '-'}
                                    color="text-green-600"
                                    bg="bg-green-50"
                                />
                                <StatusCard
                                    icon={Clock}
                                    label={t('studySessions')}
                                    value={details.studyHistory.length.toString()}
                                    color="text-orange-600"
                                    bg="bg-orange-50"
                                />
                                <StatusCard
                                    icon={Calendar}
                                    label={t('wordsReviewed')}
                                    value={details.studyHistory.reduce((acc, curr) => acc + curr.words_reviewed, 0).toString()}
                                    color="text-purple-600"
                                    bg="bg-purple-50"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">{t('failedToLoadData')}</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
                    <Button variant="ghost" onClick={onClose}>{t('closeReport')}</Button>
                </div>
            </motion.div>
        </div>
    );
}

function StatusCard({ icon: Icon, label, value, color, bg }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    color: string;
    bg: string;
}) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-lg ${bg}`}>
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
            <div>
                <p className="text-xs text-gray-500 font-medium uppercase">{label}</p>
                <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
        </div>
    );
}

function WeeklyComparisonItem({ label, thisWeek, lastWeek, suffix }: {
    label: string;
    thisWeek: number;
    lastWeek: number;
    suffix?: string;
}) {
    const { t } = useTranslation('parent');
    const diff = thisWeek - lastWeek;
    const percentChange = lastWeek > 0 ? Math.round((diff / lastWeek) * 100) : (thisWeek > 0 ? 100 : 0);

    let TrendIcon = Minus;
    let trendColor = 'text-gray-400';
    let bgColor = 'bg-gray-50';

    if (diff > 0) {
        TrendIcon = TrendingUp;
        trendColor = 'text-green-600';
        bgColor = 'bg-green-50';
    } else if (diff < 0) {
        TrendIcon = TrendingDown;
        trendColor = 'text-red-600';
        bgColor = 'bg-red-50';
    }

    const displayValue = suffix ? `${thisWeek}${suffix}` : thisWeek.toString();

    return (
        <div className="text-center p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 font-medium mb-2">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{displayValue}</p>
            <div className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-full ${bgColor}`}>
                <TrendIcon className={`w-3 h-3 ${trendColor}`} />
                <span className={`text-xs font-medium ${trendColor}`}>
                    {diff === 0 ? t('same') : `${diff > 0 ? '+' : ''}${percentChange}%`}
                </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">{t('vsLastWeek', { count: lastWeek })}</p>
        </div>
    );
}
