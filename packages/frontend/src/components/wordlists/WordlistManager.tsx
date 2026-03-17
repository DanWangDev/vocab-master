import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Upload, Edit, Trash2, Shield, Loader2 } from 'lucide-react';
import { Button } from '../common';
import { ImportModal } from './ImportModal';
import ApiService from '../../services/ApiService';
import type { Wordlist } from '../../types';
import { formatDate } from '../../utils/formatters';
import i18n from '../../i18n';

export function WordlistManager() {
  const { t } = useTranslation('wordlists');
  const navigate = useNavigate();

  const [wordlists, setWordlists] = useState<Wordlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Wordlist | null>(null);

  const loadWordlists = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiService.getWordlists();
      setWordlists(data.wordlists);
    } catch (err) {
      console.error('Failed to load wordlists:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWordlists();
  }, [loadWordlists]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    try {
      await ApiService.deleteWordlist(confirmDelete.id);
      setConfirmDelete(null);
      await loadWordlists();
    } catch (err) {
      console.error('Failed to delete wordlist:', err);
    } finally {
      setDeleting(null);
    }
  };

  const handleImportSuccess = () => {
    setShowImport(false);
    loadWordlists();
  };

  const userLists = wordlists.filter(w => !w.isSystem);
  const systemLists = wordlists.filter(w => w.isSystem);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{t('manageTitle')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="w-4 h-4" />
              {t('importList')}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowImport(true)}>
              <Plus className="w-4 h-4" />
              {t('createNew')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* User lists */}
            {userLists.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4">{t('title')}</h2>
                <div className="space-y-3">
                  {userLists.map((list, index) => (
                    <motion.div
                      key={list.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-900 truncate">{list.name}</h3>
                          {list.description && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{list.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                            <span>{t('words', { count: list.wordCount })}</span>
                            <span>{formatDate(list.createdAt, i18n.language)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => navigate(`/wordlists/manage?edit=${list.id}`)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                            title={t('editList')}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(list)}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors text-gray-500 hover:text-red-600"
                            title={t('deleteList')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}

            {userLists.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">{t('noWordlists')}</p>
                <Button variant="primary" onClick={() => setShowImport(true)}>
                  <Plus className="w-4 h-4" />
                  {t('createNew')}
                </Button>
              </div>
            )}

            {/* System lists */}
            {systemLists.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  {t('systemList')}
                </h2>
                <div className="space-y-3">
                  {systemLists.map((list) => (
                    <div
                      key={list.id}
                      className="bg-gray-50 rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-gray-700 truncate">{list.name}</h3>
                          {list.description && (
                            <p className="text-sm text-gray-500 truncate mt-0.5">{list.description}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {t('words', { count: list.wordCount })}
                          </p>
                        </div>
                        <span className="px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-full ml-4">
                          {t('system')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Import Modal */}
      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onSuccess={handleImportSuccess}
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('deleteList')}</h3>
            <p className="text-gray-600 mb-6">
              {t('deleteConfirm', { name: confirmDelete.name })}
            </p>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmDelete(null)}
                disabled={deleting !== null}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="challenge"
                fullWidth
                onClick={handleDelete}
                isLoading={deleting === confirmDelete.id}
              >
                {t('deleteList')}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
