import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { TopBar } from '../layout/TopBar';
import { pvpApi } from '../../services/api/pvpApi';
import type { PvpQuestion, PvpAnswer } from '../../services/api/pvpApi';

export function ChallengeQuiz() {
  const { t } = useTranslation('pvp');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const challengeId = Number(id);

  const [questions, setQuestions] = useState<PvpQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<PvpAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!challengeId) return;
    pvpApi.getQuestions(challengeId)
      .then(data => {
        setQuestions(data.questions);
        setLoading(false);
        startTimeRef.current = Date.now();
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load questions');
        setLoading(false);
      });
  }, [challengeId]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = (answer: string) => {
    if (showResult || !currentQuestion) return;
    setSelectedAnswer(answer);
    setShowResult(true);

    const timeSpent = Date.now() - startTimeRef.current;
    const isCorrect = answer === currentQuestion.correctAnswer;

    const pvpAnswer: PvpAnswer = {
      questionIndex: currentQuestion.index,
      word: currentQuestion.word,
      correctAnswer: currentQuestion.correctAnswer,
      selectedAnswer: answer,
      isCorrect,
      timeSpent,
    };

    setAnswers(prev => [...prev, pvpAnswer]);

    // Auto-advance after 1.5s
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        startTimeRef.current = Date.now();
      } else {
        submitAllAnswers([...answers, pvpAnswer]);
      }
    }, 1500);
  };

  const submitAllAnswers = async (allAnswers: PvpAnswer[]) => {
    setSubmitting(true);
    try {
      await pvpApi.submitAnswers(challengeId, allAnswers);
      navigate(`/pvp/${challengeId}/results`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
      setSubmitting(false);
    }
  };

  const getOptionClass = (option: string) => {
    if (!showResult) {
      return 'bg-white border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50';
    }
    if (option === currentQuestion?.correctAnswer) {
      return 'bg-green-50 border-2 border-green-400 text-green-700';
    }
    if (option === selectedAnswer && option !== currentQuestion?.correctAnswer) {
      return 'bg-red-50 border-2 border-red-400 text-red-700';
    }
    return 'bg-white border-2 border-gray-100 opacity-50';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F9FF]">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0F9FF]">
        <TopBar title={t('title')} onBack={() => navigate('/pvp')} />
        <div className="max-w-xl mx-auto px-4 pt-12 text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={() => navigate('/pvp')} className="mt-4 text-indigo-500 font-bold cursor-pointer">
            {t('backToList')}
          </button>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F9FF] gap-4">
        <Loader2 size={40} className="animate-spin text-indigo-500" />
        <p className="text-gray-600 font-medium">{t('submitting')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F9FF] background-pattern">
      <TopBar
        title={t('question', { current: currentIndex + 1, total: questions.length })}
        onBack={() => navigate('/pvp')}
      />

      <main className="max-w-xl mx-auto px-4 pt-6 pb-20">
        {/* Progress bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
            animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
            >
              {/* Word prompt */}
              <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  What does this word mean?
                </p>
                <p className="text-2xl font-black text-gray-900">{currentQuestion.word}</p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <motion.button
                    key={`${currentIndex}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleAnswer(option)}
                    disabled={showResult}
                    className={`w-full p-4 rounded-2xl text-left font-medium text-sm transition-all cursor-pointer ${getOptionClass(option)}`}
                  >
                    <span className="text-gray-400 font-bold mr-3">{String.fromCharCode(65 + idx)}.</span>
                    {option}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
