import { useState, useEffect, useMemo, useReducer } from 'react';
import { useTranslation } from 'react-i18next';
import { gamificationApi, type HeatmapDay } from '../../services/api/gamificationApi';

interface ActivityHeatmapProps {
  className?: string;
}

const CELL_COLORS = [
  'bg-gray-200',      // 0 activities
  'bg-emerald-200',   // 1
  'bg-emerald-400',   // 2-3
  'bg-emerald-600',   // 4+
];

function getColorClass(count: number): string {
  if (count === 0) return CELL_COLORS[0];
  if (count === 1) return CELL_COLORS[1];
  if (count <= 3) return CELL_COLORS[2];
  return CELL_COLORS[3];
}

type HeatmapState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; days: HeatmapDay[] };

function heatmapReducer(_state: HeatmapState, action: { type: 'loading' } | { type: 'error' } | { type: 'loaded'; days: HeatmapDay[] }): HeatmapState {
  switch (action.type) {
    case 'loading': return { status: 'loading' };
    case 'error': return { status: 'error' };
    case 'loaded': return { status: 'loaded', days: action.days };
  }
}

export function ActivityHeatmap({ className = '' }: ActivityHeatmapProps) {
  const { t } = useTranslation('gamification');
  const [state, dispatch] = useReducer(heatmapReducer, { status: 'loading' });
  const [tooltip, setTooltip] = useState<{ day: HeatmapDay; x: number; y: number } | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    dispatch({ type: 'loading' });
    gamificationApi.getActivityHeatmap(90)
      .then(res => { if (!cancelled) dispatch({ type: 'loaded', days: res.days }); })
      .catch(() => { if (!cancelled) dispatch({ type: 'error' }); });
    return () => { cancelled = true; };
  }, [retryCount]);

  const loading = state.status === 'loading';
  const error = state.status === 'error';
  const data = state.status === 'loaded' ? state.days : [];

  // Build 91-day grid (13 weeks × 7 days)
  const grid = useMemo(() => {
    const days = state.status === 'loaded' ? state.days : [];
    const dayMap = new Map(days.map(d => [d.date, d]));
    const cells: Array<{ date: string; day: HeatmapDay | null; row: number; col: number }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 90 days ago, aligned to column structure
    for (let i = 90; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay(); // 0=Sun
      const col = Math.floor((90 - i) / 7);
      const row = dayOfWeek;
      cells.push({
        date: dateStr,
        day: dayMap.get(dateStr) ?? null,
        row,
        col,
      });
    }
    return cells;
  }, [state]);

  const monthLabels = useMemo(() => {
    const labels: Array<{ label: string; col: number }> = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;

    for (const cell of grid) {
      const month = new Date(cell.date).getMonth();
      if (month !== lastMonth) {
        labels.push({ label: months[month], col: cell.col });
        lastMonth = month;
      }
    }
    return labels;
  }, [grid]);

  if (error) {
    return (
      <div className={`text-center py-4 ${className}`}>
        <p className="text-sm text-gray-500">{t('heatmapError')}</p>
        <button onClick={() => setRetryCount(c => c + 1)} className="text-xs text-primary-600 font-bold mt-1">
          {t('retry')}
        </button>
      </div>
    );
  }

  const maxCol = grid.length > 0 ? Math.max(...grid.map(c => c.col)) : 12;

  return (
    <div
      className={`relative ${className}`}
      role="img"
      aria-label={t('heatmapLabel')}
    >
      {/* Month labels — aligned to grid columns */}
      <div
        className="grid mb-1 ml-5"
        style={{ gridTemplateColumns: `repeat(${maxCol + 1}, 1fr)`, gap: '2px' }}
      >
        {monthLabels.map((m, i) => (
          <span
            key={i}
            className="text-[9px] text-gray-400 font-medium"
            style={{ gridColumn: m.col + 1 }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="flex pb-1">
        {/* Day labels */}
        <div className="flex flex-col gap-[2px] sm:gap-[3px] mr-1 flex-shrink-0 justify-between">
          {['', 'M', '', 'W', '', 'F', ''].map((label, i) => (
            <div key={i} className="flex items-center flex-1">
              <span className="text-[8px] text-gray-400 w-4 text-right">{label}</span>
            </div>
          ))}
        </div>

        {/* Grid — cells stretch to fill width */}
        <div
          className="grid gap-[2px] sm:gap-[3px] flex-1"
          style={{
            gridTemplateRows: 'repeat(7, 1fr)',
            gridTemplateColumns: `repeat(${maxCol + 1}, 1fr)`,
            gridAutoFlow: 'column',
          }}
        >
          {loading
            ? [...Array(91)].map((_, i) => (
                <div key={i} className="aspect-square rounded-sm bg-gray-200 animate-pulse" />
              ))
            : grid.map((cell, i) => {
                const count = cell.day?.activityCount ?? 0;
                return (
                  <button
                    key={i}
                    className={`aspect-square rounded-sm ${getColorClass(count)} transition-colors cursor-pointer hover:ring-1 hover:ring-primary-400`}
                    onMouseEnter={(e) => cell.day && setTooltip({ day: cell.day, x: e.clientX, y: e.clientY })}
                    onFocus={() => cell.day && setTooltip({ day: cell.day, x: 0, y: 0 })}
                    onMouseLeave={() => setTooltip(null)}
                    onBlur={() => setTooltip(null)}
                    aria-label={`${cell.date}: ${count} activities`}
                    tabIndex={0}
                  />
                );
              })
          }
        </div>
      </div>

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
          <p className="text-xs text-gray-500 text-center px-4">{t('heatmapEmpty')}</p>
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 10, top: tooltip.y - 40 }}
        >
          <p className="font-bold">{tooltip.day.date}</p>
          <p>{tooltip.day.activityCount} activities ({tooltip.day.types.join(', ')})</p>
        </div>
      )}
    </div>
  );
}
