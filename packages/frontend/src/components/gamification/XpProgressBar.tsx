import { useTranslation } from 'react-i18next';
import { useXp } from '../../contexts/XpContext';

export function XpProgressBar() {
  const { t } = useTranslation('gamification');
  const { levelInfo } = useXp();

  if (!levelInfo) {
    return (
      <div className="w-full">
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full w-0 bg-gray-300 rounded-full" />
        </div>
        <p className="text-[10px] text-gray-400 mt-0.5">-- / --</p>
      </div>
    );
  }

  const { xpInLevel, xpNeeded, totalXp, nextLevelXp } = levelInfo;
  const progress = xpNeeded > 0 ? Math.min((xpInLevel / xpNeeded) * 100, 100) : 0;

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={totalXp}
      aria-valuemin={levelInfo.currentLevelXp}
      aria-valuemax={nextLevelXp}
    >
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-500 font-bold mt-0.5">
        {t('xpProgress', {
          current: totalXp.toLocaleString(),
          total: nextLevelXp.toLocaleString(),
        })}
      </p>
    </div>
  );
}
