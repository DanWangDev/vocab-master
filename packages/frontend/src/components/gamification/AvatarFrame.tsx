interface AvatarFrameProps {
  username: string;
  frameSlug: string | null;
  size?: number;
}

const FRAME_STYLES: Record<string, { ringColor: string; ringWidth: number; glow?: string; crown?: boolean }> = {
  bronze_ring: {
    ringColor: 'from-amber-600 to-amber-400',
    ringWidth: 2,
  },
  silver_crown: {
    ringColor: 'from-gray-300 to-gray-100',
    ringWidth: 2,
    crown: true,
  },
  golden_shield: {
    ringColor: 'from-amber-400 to-yellow-300',
    ringWidth: 3,
    glow: '0 0 8px rgba(251,191,36,0.4)',
  },
};

export function AvatarFrame({ username, frameSlug, size = 36 }: AvatarFrameProps) {
  const initial = (username || '?')[0].toUpperCase();
  const frame = frameSlug ? FRAME_STYLES[frameSlug] : null;

  if (!frame) {
    return (
      <div
        className="rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black"
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initial}
      </div>
    );
  }

  const outerSize = size + frame.ringWidth * 2 + 4;

  return (
    <div className="relative" style={{ width: outerSize, height: outerSize }}>
      {/* Crown */}
      {frame.crown && (
        <span
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs z-10"
          style={{ fontSize: size * 0.3 }}
        >
          ♛
        </span>
      )}

      {/* Ring */}
      <div
        className={`rounded-full bg-gradient-to-br ${frame.ringColor} flex items-center justify-center`}
        style={{
          width: outerSize,
          height: outerSize,
          boxShadow: frame.glow,
        }}
      >
        {/* Avatar */}
        <div
          className="rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initial}
        </div>
      </div>
    </div>
  );
}
