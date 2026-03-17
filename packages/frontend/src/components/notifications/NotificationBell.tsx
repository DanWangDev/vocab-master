import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import { NotificationDropdown } from './NotificationDropdown';

export function NotificationBell() {
  const { t } = useTranslation('notifications');
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const { unreadCount } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={bellRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-white border-2 border-primary-200 rounded-xl shadow-clay-sm hover:shadow-clay transition-all duration-200 cursor-pointer"
        aria-label={unreadCount > 0 ? t('unreadCount', { count: unreadCount }) : t('title')}
      >
        <Bell size={20} className="text-primary-600" />

        {/* Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-bold text-white bg-red-500 rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {isOpen && (
          <NotificationDropdown onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
