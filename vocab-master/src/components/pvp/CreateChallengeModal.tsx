import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Swords, Loader2 } from 'lucide-react';
import { pvpApi } from '../../services/api/pvpApi';
import { wordlistApi } from '../../services/api/wordlistApi';
import type { PvpOpponent } from '../../services/api/pvpApi';
import type { Wordlist } from '../../types/wordlist';

interface CreateChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateChallengeModal({ isOpen, onClose, onCreated }: CreateChallengeModalProps) {
  const { t } = useTranslation('pvp');

  const [query, setQuery] = useState('');
  const [opponents, setOpponents] = useState<PvpOpponent[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<PvpOpponent | null>(null);
  const [wordlists, setWordlists] = useState<Wordlist[]>([]);
  const [selectedWordlistId, setSelectedWordlistId] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      wordlistApi.getWordlists().then(data => setWordlists(data.wordlists));
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setOpponents([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await pvpApi.searchOpponents(query);
        setOpponents(data.opponents);
      } catch {
        setOpponents([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const handleSubmit = async () => {
    if (!selectedOpponent || !selectedWordlistId) return;
    setSubmitting(true);
    setError('');
    try {
      await pvpApi.createChallenge(selectedOpponent.id, selectedWordlistId, questionCount);
      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuery('');
    setOpponents([]);
    setSelectedOpponent(null);
    setSelectedWordlistId(null);
    setQuestionCount(10);
    setError('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-gray-900">{t('createChallenge')}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 cursor-pointer">
              <X size={20} />
            </button>
          </div>

          {/* Opponent Search */}
          <div className="mb-4">
            <label className="text-sm font-bold text-gray-600 mb-2 block">{t('selectOpponent')}</label>
            {selectedOpponent ? (
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl p-3">
                <span className="font-bold text-indigo-700">
                  {selectedOpponent.displayName || selectedOpponent.username}
                </span>
                <button
                  onClick={() => setSelectedOpponent(null)}
                  className="text-indigo-400 hover:text-indigo-600 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('searchOpponent')}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm"
                />
                {searching && (
                  <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
                )}
              </div>
            )}

            {!selectedOpponent && opponents.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                {opponents.map(opp => (
                  <button
                    key={opp.id}
                    onClick={() => {
                      setSelectedOpponent(opp);
                      setQuery('');
                      setOpponents([]);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors text-sm cursor-pointer"
                  >
                    <span className="font-bold">{opp.displayName || opp.username}</span>
                    {opp.displayName && (
                      <span className="text-gray-400 ml-2">@{opp.username}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!selectedOpponent && query.length >= 2 && !searching && opponents.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">{t('noOpponentsFound')}</p>
            )}
          </div>

          {/* Wordlist Selection */}
          <div className="mb-4">
            <label className="text-sm font-bold text-gray-600 mb-2 block">{t('selectWordlist')}</label>
            <select
              value={selectedWordlistId || ''}
              onChange={e => setSelectedWordlistId(Number(e.target.value) || null)}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-indigo-400 focus:outline-none text-sm"
            >
              <option value="">{t('selectWordlist')}</option>
              {wordlists.map(wl => (
                <option key={wl.id} value={wl.id}>{wl.name} ({wl.wordCount} words)</option>
              ))}
            </select>
          </div>

          {/* Question Count */}
          <div className="mb-6">
            <label className="text-sm font-bold text-gray-600 mb-2 block">
              {t('questionCount')}: {questionCount}
            </label>
            <input
              type="range"
              min={5}
              max={20}
              value={questionCount}
              onChange={e => setQuestionCount(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>5</span>
              <span>20</span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4">{error}</p>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!selectedOpponent || !selectedWordlistId || submitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer hover:shadow-lg transition-shadow"
          >
            {submitting ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Swords size={20} />
                {t('challenge')}
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
