import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface WeakWordsTableProps {
    words: {
        word: string;
        incorrect_count: number;
        total_attempts: number;
    }[];
}

export function WeakWordsTable({ words }: WeakWordsTableProps) {
    const { t } = useTranslation('parent');

    return (
        <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">{t('quizWordsToRevise')}</h3>
            <p className="text-xs text-gray-500 mb-4">{t('basedOnQuizResults')}</p>

            {!words || words.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                    {t('noWeakWords')}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">{t('word')}</th>
                                <th className="px-4 py-3 rounded-r-lg">{t('errorRate')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {words.map((item, index) => {
                                const errorRate = Math.round((item.incorrect_count / item.total_attempts) * 100);

                                return (
                                    <motion.tr
                                        key={item.word}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="bg-white border-b hover:bg-gray-50"
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {item.word}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                                    <div
                                                        className="bg-red-500 h-1.5 rounded-full"
                                                        style={{ width: `${errorRate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-red-600 font-bold">{errorRate}%</span>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
