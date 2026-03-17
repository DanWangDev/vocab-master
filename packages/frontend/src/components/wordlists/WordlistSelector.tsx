import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, Shield, Lock, Globe, Loader2, Settings } from 'lucide-react';
import { Modal, Button } from '../common';
import { useApp } from '../../contexts/AppContext';
import { useAuth } from '../../contexts/AuthContext';
import ApiService from '../../services/ApiService';
import type { Wordlist } from '../../types';

interface WordlistSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const visibilityIcons = {
  system: Shield,
  private: Lock,
  shared: Globe,
};

export function WordlistSelector({ isOpen, onClose }: WordlistSelectorProps) {
  const { t } = useTranslation('wordlists');
  const { activeWordlist, switchWordlist } = useApp();
  const { state: authState } = useAuth();
  const navigate = useNavigate();

  const [wordlists, setWordlists] = useState<Wordlist[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);

  const userRole = authState.user?.role || 'student';
  const canManage = userRole === 'admin' || userRole === 'parent';

  useEffect(() => {
    if (isOpen) {
      fetchWordlists();
    }
  }, [isOpen]);

  const fetchWordlists = async () => {
    setLoading(true);
    try {
      const data = await ApiService.getWordlists();
      setWordlists(data.wordlists);
    } catch (err) {
      console.error('Failed to fetch wordlists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (id: number) => {
    if (activeWordlist?.id === id) return;
    setSwitching(id);
    try {
      await switchWordlist(id);
      onClose();
    } catch (err) {
      console.error('Failed to switch wordlist:', err);
    } finally {
      setSwitching(null);
    }
  };

  const handleManage = () => {
    onClose();
    navigate('/wordlists/manage');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('selectWordlist')} size="lg">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="space-y-3">
          {wordlists.length === 0 && (
            <p className="text-center text-gray-500 py-8">{t('noWordlists')}</p>
          )}

          {wordlists.map((list, index) => {
            const isActive = activeWordlist?.id === list.id;
            const isSwitching = switching === list.id;
            const VisibilityIcon = visibilityIcons[list.visibility] || Globe;

            return (
              <motion.button
                key={list.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSelect(list.id)}
                disabled={isSwitching}
                className={`
                  w-full text-left p-4 rounded-xl border-2 transition-all cursor-pointer
                  ${isActive
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-100 bg-white hover:border-primary-200 hover:bg-primary-50/30'
                  }
                  disabled:opacity-50
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 truncate">{list.name}</h3>
                      {list.isSystem && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full">
                          {t('system')}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <VisibilityIcon className="w-3 h-3" />
                      </span>
                    </div>
                    {list.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{list.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {t('words', { count: list.wordCount })}
                    </p>
                  </div>

                  {isSwitching ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                  ) : isActive ? (
                    <div className="bg-primary-500 rounded-full p-1">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  ) : null}
                </div>
              </motion.button>
            );
          })}

          {canManage && (
            <div className="pt-3 border-t border-gray-100">
              <Button variant="outline" fullWidth onClick={handleManage} size="sm">
                <Settings className="w-4 h-4" />
                {t('manageWordlists')}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
