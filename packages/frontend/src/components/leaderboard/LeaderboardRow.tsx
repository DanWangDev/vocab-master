import type { LeaderboardEntry } from '../../services/api/leaderboardApi';

const RANK_STYLES: Record<number, string> = {
  1: 'bg-amber-100 border-amber-300 text-amber-700',
  2: 'bg-gray-100 border-gray-300 text-gray-600',
  3: 'bg-orange-100 border-orange-300 text-orange-700',
};

const RANK_BADGES: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
};

interface Props extends LeaderboardEntry {
  isCurrentUser: boolean;
}

export function LeaderboardRow({
  rank,
  username,
  displayName,
  score,
  quizzesCompleted,
  wordsMastered,
  streakDays,
  isCurrentUser,
}: Props) {
  const rankStyle = RANK_STYLES[rank] || 'bg-white border-gray-100';

  return (
    <div
      className={`
        flex items-center gap-3 p-3 rounded-2xl border-2 transition-all
        ${rankStyle}
        ${isCurrentUser ? 'ring-2 ring-violet-400 ring-offset-1' : ''}
      `}
    >
      {/* Rank */}
      <div className="w-8 text-center font-black text-lg">
        {RANK_BADGES[rank] || `#${rank}`}
      </div>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
        {(displayName || username).charAt(0).toUpperCase()}
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className={`font-bold truncate ${isCurrentUser ? 'text-violet-700' : 'text-gray-800'}`}>
          {displayName || username}
          {isCurrentUser && <span className="text-xs ml-1 text-violet-500">(you)</span>}
        </p>
        <div className="flex gap-3 text-xs text-gray-400">
          <span>📝 {quizzesCompleted}</span>
          <span>📚 {wordsMastered}</span>
          <span>🔥 {streakDays}d</span>
        </div>
      </div>

      {/* Score */}
      <div className="text-right">
        <p className="font-black text-lg">{score.toLocaleString()}</p>
        <p className="text-xs text-gray-400">pts</p>
      </div>
    </div>
  );
}
