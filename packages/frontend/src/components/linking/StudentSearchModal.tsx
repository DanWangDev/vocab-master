import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, UserPlus, Check, Clock, Loader2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import ApiService from '../../services/ApiService';
import type { StudentSearchResult } from '../../services/ApiService';

interface StudentSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function StudentSearchModal({ isOpen, onClose, onSuccess }: StudentSearchModalProps) {
  const { t } = useTranslation('linking');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StudentSearchResult[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentSearchResult | null>(null);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const debouncedQuery = useDebounce(query, 300);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Search students when query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setSearching(true);
      setError(null);
      try {
        const response = await ApiService.searchStudents(debouncedQuery);
        setResults(response.results);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setSearching(false);
      }
    };

    search();
  }, [debouncedQuery]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedStudent(null);
      setMessage('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSendRequest = async () => {
    if (!selectedStudent) return;

    setSending(true);
    setError(null);
    try {
      await ApiService.sendLinkRequest(selectedStudent.id, message || undefined);
      setSuccess(true);
      timeoutRef.current = setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: StudentSearchResult['status']) => {
    switch (status) {
      case 'available':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-study bg-study/10 rounded-full">
            <Check size={12} />
            {t('available')}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
            <Clock size={12} />
            {t('pending')}
          </span>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('linkStudentAccount')} size="md">
      {success ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="py-8 text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-study/10 rounded-full flex items-center justify-center">
            <Check size={32} className="text-study" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{t('requestSent')}</h3>
          <p className="text-gray-600">
            {t('requestSentDesc', { name: selectedStudent?.displayName || selectedStudent?.username })}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors"
              autoFocus
            />
            {searching && (
              <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-500 animate-spin" />
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Search results */}
          {!selectedStudent && (
            <div className="max-h-60 overflow-y-auto">
              {query.length > 0 && query.length < 2 && (
                <p className="text-center text-gray-500 py-4 text-sm">
                  {t('minCharsToSearch')}
                </p>
              )}

              {debouncedQuery.length >= 2 && !searching && results.length === 0 && (
                <p className="text-center text-gray-500 py-4 text-sm">
                  {t('noStudentsFound', { query: debouncedQuery })}
                </p>
              )}

              <AnimatePresence mode="popLayout">
                {results.map((student) => (
                  <motion.button
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => student.status === 'available' && setSelectedStudent(student)}
                    disabled={student.status !== 'available'}
                    className={`
                      w-full p-3 text-left rounded-xl border-2 mb-2 transition-all
                      ${student.status === 'available'
                        ? 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 cursor-pointer'
                        : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-60'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {student.displayName || student.username}
                        </p>
                        <p className="text-sm text-gray-500">@{student.username}</p>
                      </div>
                      {getStatusBadge(student.status)}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Selected student */}
          {selectedStudent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 bg-primary-50 rounded-xl border-2 border-primary-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {selectedStudent.displayName || selectedStudent.username}
                    </p>
                    <p className="text-sm text-gray-500">@{selectedStudent.username}</p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Optional message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('messageOptional')}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t('messagePlaceholder')}
                  maxLength={500}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none transition-colors resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {message.length}/500
                </p>
              </div>

              {/* Send button */}
              <button
                onClick={handleSendRequest}
                disabled={sending}
                className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('sending')}
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    {t('sendLinkRequest')}
                  </>
                )}
              </button>
            </motion.div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default StudentSearchModal;
