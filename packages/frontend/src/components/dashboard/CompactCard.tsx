import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface CompactCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
  badge?: string;
}

export function CompactCard({ title, icon: Icon, color, onClick, badge }: CompactCardProps) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      className={`
        relative w-full p-4 rounded-2xl text-left text-white cursor-pointer
        border border-white/20
        ${color}
        transition-all duration-300
        focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-white
      `}
    >
      <div className="flex flex-col items-center text-center gap-2">
        <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm shadow-inner">
          <Icon className="w-5 h-5 drop-shadow-md text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xs font-black tracking-tight drop-shadow-sm leading-tight">{title}</span>
      </div>
      {badge && (
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase bg-white text-gray-800 rounded-full shadow-sm">
          {badge}
        </span>
      )}
    </motion.button>
  );
}
