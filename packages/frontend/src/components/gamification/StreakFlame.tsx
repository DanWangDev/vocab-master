import { useTranslation } from 'react-i18next';
import { Wind } from 'lucide-react';

interface StreakFlameProps {
  streak: number;
  previousStreak?: number;
}

function getFlameTier(streak: number) {
  if (streak >= 30) return 5;
  if (streak >= 14) return 4;
  if (streak >= 7) return 3;
  if (streak >= 3) return 2;
  if (streak >= 1) return 1;
  return 0;
}

const FLAME_CONFIGS = [
  // Tier 0: No flame
  { size: 24, gradient: '', animation: '' },
  // Tier 1: Small gray-blue
  { size: 24, gradient: 'from-gray-400 to-gray-300', animation: '' },
  // Tier 2: Orange, gentle pulse
  { size: 32, gradient: 'from-orange-400 to-amber-500', animation: 'animate-pulse-slow' },
  // Tier 3: Orange-red, steady glow
  { size: 40, gradient: 'from-orange-500 to-red-500', animation: 'animate-pulse-slow' },
  // Tier 4: Bright with particles
  { size: 48, gradient: 'from-red-500 to-amber-400', animation: 'animate-pulse-slow' },
  // Tier 5: Golden, radiant
  { size: 56, gradient: 'from-amber-400 to-yellow-300', animation: 'animate-pulse-slow' },
];

export function StreakFlame({ streak, previousStreak }: StreakFlameProps) {
  const { t } = useTranslation('gamification');
  const tier = getFlameTier(streak);
  const config = FLAME_CONFIGS[tier];

  // Streak-break state
  const streakBroken = previousStreak !== undefined && previousStreak > 0 && streak === 0;

  if (tier === 0) {
    return (
      <div className="flex items-center gap-2" aria-label={t('startYourStreak')}>
        <Wind className="w-6 h-6 text-gray-400" />
        <span className="text-sm font-bold text-gray-500">
          {streakBroken
            ? t('streakEnded', { count: previousStreak })
            : t('startYourStreak')
          }
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2" aria-label={t('streakDays', { count: streak })}>
      <div
        className={`relative ${config.animation}`}
        style={{ width: config.size, height: config.size }}
      >
        {/* SVG Flame */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={`w-full h-full drop-shadow-lg`}
        >
          <defs>
            <linearGradient id={`flame-grad-${tier}`} x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" className={`[stop-color:var(--flame-start)]`} />
              <stop offset="100%" className={`[stop-color:var(--flame-end)]`} />
            </linearGradient>
          </defs>
          <path
            d="M12 2C12 2 4 9 4 14C4 18.4183 7.58172 22 12 22C16.4183 22 20 18.4183 20 14C20 9 12 2 12 2Z"
            fill={`url(#flame-grad-${tier})`}
            className={`${tier >= 3 ? 'filter drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]' : ''}`}
          />
          <path
            d="M12 22C14.2091 22 16 19.9853 16 17.5C16 15.0147 12 10 12 10C12 10 8 15.0147 8 17.5C8 19.9853 9.79086 22 12 22Z"
            fill="rgba(255,255,255,0.3)"
          />
        </svg>
        <style>{`
          [id="flame-grad-${tier}"] stop:first-child { --flame-start: ${getColor(tier, 'start')}; stop-color: var(--flame-start); }
          [id="flame-grad-${tier}"] stop:last-child { --flame-end: ${getColor(tier, 'end')}; stop-color: var(--flame-end); }
        `}</style>

        {/* Particles for tier 4+ */}
        {tier >= 4 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-amber-400 animate-bounce"
                style={{
                  left: `${30 + i * 20}%`,
                  top: `${10 + i * 15}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '1.5s',
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <span className="text-lg font-black text-gray-800">{streak}</span>
        <span className="text-xs font-bold text-gray-500 ml-1">{t('streak')}</span>
      </div>
    </div>
  );
}

function getColor(tier: number, position: 'start' | 'end'): string {
  const colors: Record<number, { start: string; end: string }> = {
    1: { start: '#9CA3AF', end: '#D1D5DB' },
    2: { start: '#FB923C', end: '#F59E0B' },
    3: { start: '#F97316', end: '#EF4444' },
    4: { start: '#EF4444', end: '#FBBF24' },
    5: { start: '#FBBF24', end: '#FDE047' },
  };
  return colors[tier]?.[position] ?? '#9CA3AF';
}
