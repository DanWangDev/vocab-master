import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '../common';

interface DeleteConfirmModalProps {
    userName: string;
    userRole: string;
    onConfirm: () => Promise<void>;
    onClose: () => void;
}

export function DeleteConfirmModal({ userName, userRole, onConfirm, onClose }: DeleteConfirmModalProps) {
    const { t } = useTranslation('admin');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setLoading(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-full">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">{t('deleteUser')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 mb-4">
                        {t('deleteConfirmPlain', { name: userName })}
                    </p>

                    <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4">
                        <p className="text-sm text-red-800 font-medium mb-2">{t('deleteWarning')}</p>
                        <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                            <li>{t('deleteItem.account')}</li>
                            <li>{t('deleteItem.quizResults')}</li>
                            <li>{t('deleteItem.studyHistory')}</li>
                            <li>{t('deleteItem.challengeRecords')}</li>
                            {userRole === 'parent' && (
                                <li>{t('deleteItem.parentLinks')}</li>
                            )}
                        </ul>
                    </div>

                    <p className="text-sm text-gray-500">
                        {t('deleteCannotUndo')}
                    </p>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-4 border-t border-gray-100 bg-gray-50">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                {t('deleting')}
                            </>
                        ) : (
                            t('deleteUser')
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
