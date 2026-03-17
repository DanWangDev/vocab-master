import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, ChevronDown, Cloud } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { LanguageSwitcher } from './LanguageSwitcher';

export function UserMenu() {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { state: authState, logout } = useAuth();
  const { state: appState } = useApp();
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await logout();
    navigate('/login');
  };

  if (!authState.user) return null;

  const displayName = authState.user.displayName || authState.user.username;

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-primary-200 rounded-xl shadow-clay-sm hover:shadow-clay transition-all duration-200 cursor-pointer"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
          <User size={16} className="text-white" />
        </div>
        <span className="text-primary-800 text-sm font-bold max-w-[100px] truncate hidden sm:block">
          {displayName}
        </span>
        {appState.isSyncing ? (
          <Cloud size={16} className="text-primary-500 animate-pulse" />
        ) : (
          <ChevronDown
            size={16}
            className={`text-primary-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-56 bg-white border-2 border-primary-100 rounded-xl shadow-clay overflow-hidden"
          >
            {/* User info */}
            <div className="px-4 py-3 border-b border-primary-100 bg-primary-50/50">
              <p className="text-primary-900 font-bold truncate">{displayName}</p>
              <p className="text-primary-600 text-sm truncate">@{authState.user.username}</p>
            </div>

            {/* Sync status */}
            <div className="px-4 py-2 border-b border-primary-100 flex items-center gap-2">
              {appState.isSyncing ? (
                <>
                  <Cloud size={16} className="text-primary-500 animate-pulse" />
                  <span className="text-sm text-primary-600 font-medium">{t('syncing')}</span>
                </>
              ) : (
                <>
                  <Cloud size={16} className="text-study" />
                  <span className="text-sm text-study font-medium">{t('synced')}</span>
                </>
              )}
            </div>

            {/* Language */}
            <div className="px-4 py-2 border-b border-primary-100 flex items-center justify-between">
              <LanguageSwitcher />
            </div>

            {/* Menu items */}
            <div className="py-1">
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer font-semibold"
                disabled={appState.isSyncing}
              >
                <LogOut size={16} />
                {t('signOut')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UserMenu;
