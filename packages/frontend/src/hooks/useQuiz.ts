import { useState, useCallback, useMemo } from 'react';
import type { VocabularyWord, QuizQuestion, QuizState, QuizConfig, AnswerRecord } from '../types';
import { generateQuizQuestions } from '../services/QuizGenerator';

interface UseQuizReturn {
  state: QuizState;
  currentQuestion: QuizQuestion | null;
  startQuiz: (overrideConfig?: QuizConfig) => void;
  submitAnswer: (answer: string, timeSpent: number) => boolean;
  nextQuestion: () => void;
  resetQuiz: () => void;
  isLastQuestion: boolean;
  correctCount: number;
}

export function useQuiz(
  words: VocabularyWord[],
  config: QuizConfig
): UseQuizReturn {
  const [state, setState] = useState<QuizState>({
    questions: [],
    currentIndex: 0,
    score: 0,
    timePerQuestion: config.timePerQuestion,
    totalQuestions: config.totalQuestions,
    answers: [],
    status: 'setup',
  });

  const currentQuestion = useMemo(() => {
    return state.questions[state.currentIndex] || null;
  }, [state.questions, state.currentIndex]);

  const isLastQuestion = state.currentIndex >= state.totalQuestions - 1;

  const correctCount = useMemo(() => {
    return state.answers.filter(a => a.isCorrect).length;
  }, [state.answers]);

  const startQuiz = useCallback((overrideConfig?: QuizConfig) => {
    const activeConfig = overrideConfig || config;
    const questions = generateQuizQuestions(words, activeConfig.totalQuestions);
    setState({
      questions,
      currentIndex: 0,
      score: 0,
      timePerQuestion: activeConfig.timePerQuestion,
      totalQuestions: activeConfig.totalQuestions,
      answers: [],
      status: 'active',
    });
  }, [words, config]);

  const submitAnswer = useCallback((answer: string, timeSpent: number): boolean => {
    const question = state.questions[state.currentIndex];
    if (!question) return false;

    const isCorrect = answer.toLowerCase() === question.correctAnswer.toLowerCase();

    const record: AnswerRecord = {
      questionId: question.id,
      selectedAnswer: answer,
      isCorrect,
      timeSpent,
    };

    setState(prev => ({
      ...prev,
      answers: [...prev.answers, record],
      score: isCorrect ? prev.score + 1 : prev.score,
      status: 'review',
    }));

    return isCorrect;
  }, [state.questions, state.currentIndex]);

  const nextQuestion = useCallback(() => {
    setState(prev => {
      if (prev.currentIndex >= prev.totalQuestions - 1) {
        return { ...prev, status: 'complete' };
      }
      return {
        ...prev,
        currentIndex: prev.currentIndex + 1,
        status: 'active',
      };
    });
  }, []);

  const resetQuiz = useCallback(() => {
    setState({
      questions: [],
      currentIndex: 0,
      score: 0,
      timePerQuestion: config.timePerQuestion,
      totalQuestions: config.totalQuestions,
      answers: [],
      status: 'setup',
    });
  }, [config.timePerQuestion, config.totalQuestions]);

  return {
    state,
    currentQuestion,
    startQuiz,
    submitAnswer,
    nextQuestion,
    resetQuiz,
    isLastQuestion,
    correctCount,
  };
}
