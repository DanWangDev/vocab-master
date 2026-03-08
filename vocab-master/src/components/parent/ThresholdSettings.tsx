import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, Loader2 } from 'lucide-react';
import { ApiService, type ParentThresholds } from '../../services/ApiService';

interface ThresholdSettingsProps {
    onUpdate?: (thresholds: ParentThresholds) => void;
}

export function ThresholdSettings({ onUpdate }: ThresholdSettingsProps) {
    const { t } = useTranslation('parent');
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [daysPerWeek, setDaysPerWeek] = useState(5);
    const [minutesPerDay, setMinutesPerDay] = useState(20);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        ApiService.getThresholds()
            .then(data => {
                setDaysPerWeek(data.days_per_week);
                setMinutesPerDay(data.minutes_per_day);
            })
            .finally(() => setLoading(false));
    }, [open]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const result = await ApiService.updateThresholds({
                days_per_week: daysPerWeek,
                minutes_per_day: minutesPerDay,
            });
            onUpdate?.(result);
            setOpen(false);
        } finally {
            setSaving(false);
        }
    };

    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
            >
                <Settings className="w-4 h-4" />
                {t('onTrackSettings')}
            </button>
        );
    }

    return (
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('onTrackThresholds')}</h4>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('targetDaysPerWeek')}</label>
                        <input
                            type="range"
                            min={1}
                            max={7}
                            value={daysPerWeek}
                            onChange={e => setDaysPerWeek(Number(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            {t('daysOfSeven', { count: daysPerWeek })}
                        </span>
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t('targetMinutesPerDay')}</label>
                        <input
                            type="range"
                            min={5}
                            max={120}
                            step={5}
                            value={minutesPerDay}
                            onChange={e => setMinutesPerDay(Number(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                            {t('minutesPerDayValue', { count: minutesPerDay })}
                        </span>
                    </div>
                    <div className="flex gap-2 pt-1">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )}
                            {t('save')}
                        </button>
                        <button
                            onClick={() => setOpen(false)}
                            className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            {t('cancelRequest')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
