import { useTranslation } from 'react-i18next';
import { useXp } from '../../contexts/XpContext';

interface LevelBadgeProps {
  compact?: boolean;
  level?: number;
  title?: string;
}

export function LevelBadge({ compact = false, level: overrideLevel, title: overrideTitle }: LevelBadgeProps) {
  const { t } = useTranslation('gamification');
  const { levelInfo } = useXp();

  const level = overrideLevel ?? levelInfo?.level ?? null;
  const title = overrideTitle ?? levelInfo?.title ?? '';

  if (level === null) {
    return <span className="text-xs font-bold text-gray-400">Lv. —</span>;
  }

  if (compact) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-primary-100 text-primary-700 text-xs font-black">
        {t('levelCompact', { level })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-100 text-primary-700 text-xs font-black">
      <span className="hidden sm:inline">{t('levelTitle', { level, title })}</span>
      <span className="sm:hidden">{t('levelCompact', { level })}</span>
    </span>
  );
}
