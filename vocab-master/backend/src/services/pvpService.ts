import { pvpRepository, wordlistRepository, notificationRepository, userRepository } from '../repositories/index.js';
import { checkAndAwardAchievements } from './achievementService.js';
import type { PvpChallengeWithUsers, WordlistWordRow } from '../types/index.js';

export interface PvpQuestion {
  index: number;
  word: string;
  correctAnswer: string;
  options: string[];
}

function shuffleArray<T>(arr: readonly T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateQuestions(words: WordlistWordRow[], count: number): PvpQuestion[] {
  const selected = shuffleArray(words).slice(0, count);
  const allDefinitions = words.map(w => {
    try {
      const defs = JSON.parse(w.definitions) as string[];
      return defs[0] || w.target_word;
    } catch {
      return w.target_word;
    }
  });

  return selected.map((word, index) => {
    let correctAnswer: string;
    try {
      const defs = JSON.parse(word.definitions) as string[];
      correctAnswer = defs[0] || '';
    } catch {
      correctAnswer = '';
    }

    // Generate wrong options from other words' definitions
    const wrongOptions = shuffleArray(
      allDefinitions.filter(d => d !== correctAnswer)
    ).slice(0, 3);

    return {
      index,
      word: word.target_word,
      correctAnswer,
      options: shuffleArray([correctAnswer, ...wrongOptions]),
    };
  });
}

export const pvpService = {
  createChallenge(challengerId: number, opponentId: number, wordlistId: number, questionCount = 10) {
    if (challengerId === opponentId) {
      throw new Error('Cannot challenge yourself');
    }

    // Verify wordlist has enough words
    const words = wordlistRepository.getWords(wordlistId);
    if (words.length < questionCount) {
      throw new Error(`Wordlist needs at least ${questionCount} words`);
    }

    // 24 hour expiry
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const challenge = pvpRepository.create({
      challengerId,
      opponentId,
      wordlistId,
      questionCount,
      expiresAt,
    });

    // Notify opponent
    notificationRepository.create(
      opponentId,
      'achievement',
      'New PvP Challenge!',
      'Someone has challenged you to a vocabulary battle!',
      { challengeId: challenge.id, type: 'pvp_challenge' }
    );

    return challenge;
  },

  acceptChallenge(challengeId: number, userId: number) {
    const challenge = pvpRepository.findById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.opponent_id !== userId) throw new Error('Not your challenge');
    if (challenge.status !== 'pending') throw new Error('Challenge is not pending');

    pvpRepository.updateStatus(challengeId, 'active');
    return pvpRepository.findById(challengeId)!;
  },

  declineChallenge(challengeId: number, userId: number) {
    const challenge = pvpRepository.findById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.opponent_id !== userId) throw new Error('Not your challenge');
    if (challenge.status !== 'pending') throw new Error('Challenge is not pending');

    pvpRepository.updateStatus(challengeId, 'declined');

    // Notify challenger
    notificationRepository.create(
      challenge.challenger_id,
      'achievement',
      'Challenge Declined',
      `${challenge.opponent_display_name || challenge.opponent_username} declined your challenge.`,
      { challengeId, type: 'pvp_declined' }
    );
  },

  getQuestions(challengeId: number, userId: number): PvpQuestion[] {
    const challenge = pvpRepository.findById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.challenger_id !== userId && challenge.opponent_id !== userId) {
      throw new Error('Not your challenge');
    }
    if (challenge.status !== 'active') throw new Error('Challenge is not active');

    // Check if user already submitted
    const existingCount = pvpRepository.getAnswerCount(challengeId, userId);
    if (existingCount >= challenge.question_count) {
      throw new Error('Already submitted answers');
    }

    const words = wordlistRepository.getWords(challenge.wordlist_id);
    return generateQuestions(words, challenge.question_count);
  },

  submitAnswers(
    challengeId: number,
    userId: number,
    answers: Array<{ questionIndex: number; word: string; correctAnswer: string; selectedAnswer: string | null; isCorrect: boolean; timeSpent: number }>
  ) {
    const challenge = pvpRepository.findById(challengeId);
    if (!challenge) throw new Error('Challenge not found');
    if (challenge.challenger_id !== userId && challenge.opponent_id !== userId) {
      throw new Error('Not your challenge');
    }
    if (challenge.status !== 'active') throw new Error('Challenge is not active');

    // Check if already submitted
    const existingCount = pvpRepository.getAnswerCount(challengeId, userId);
    if (existingCount > 0) throw new Error('Already submitted answers');

    // Save answers
    for (const answer of answers) {
      pvpRepository.submitAnswer({
        challengeId,
        userId,
        questionIndex: answer.questionIndex,
        word: answer.word,
        correctAnswer: answer.correctAnswer,
        selectedAnswer: answer.selectedAnswer,
        isCorrect: answer.isCorrect,
        timeSpent: answer.timeSpent,
      });
    }

    // Calculate score
    const correctCount = answers.filter(a => a.isCorrect).length;
    const score = Math.round((correctCount / answers.length) * 100);

    const isChallenger = challenge.challenger_id === userId;
    pvpRepository.updateScore(challengeId, isChallenger ? 'challenger_score' : 'opponent_score', score);

    // Check if both players have submitted
    const updated = pvpRepository.findById(challengeId)!;
    if (updated.challenger_score !== null && updated.opponent_score !== null) {
      return this.resolveChallenge(updated);
    }

    // Notify the other player that it's their turn
    const otherUserId = isChallenger ? challenge.opponent_id : challenge.challenger_id;
    notificationRepository.create(
      otherUserId,
      'achievement',
      'Your Turn!',
      'Your opponent has completed their quiz. Time to play!',
      { challengeId, type: 'pvp_turn' }
    );

    return { score, waiting: true, challenge: updated };
  },

  resolveChallenge(challenge: PvpChallengeWithUsers) {
    let winnerId: number | null = null;

    if (challenge.challenger_score! > challenge.opponent_score!) {
      winnerId = challenge.challenger_id;
    } else if (challenge.opponent_score! > challenge.challenger_score!) {
      winnerId = challenge.opponent_id;
    }
    // null = draw

    pvpRepository.setWinner(challenge.id, winnerId);

    // Notify both players
    const resultMessage = winnerId
      ? `Final score: ${challenge.challenger_score} - ${challenge.opponent_score}`
      : `It's a draw! ${challenge.challenger_score} - ${challenge.opponent_score}`;

    notificationRepository.create(
      challenge.challenger_id,
      'achievement',
      'PvP Challenge Complete!',
      resultMessage,
      { challengeId: challenge.id, type: 'pvp_result', winnerId }
    );

    notificationRepository.create(
      challenge.opponent_id,
      'achievement',
      'PvP Challenge Complete!',
      resultMessage,
      { challengeId: challenge.id, type: 'pvp_result', winnerId }
    );

    // Check achievements for PvP (trigger general achievement check)
    checkAndAwardAchievements(challenge.challenger_id, {});
    checkAndAwardAchievements(challenge.opponent_id, {});

    const resolved = pvpRepository.findById(challenge.id)!;
    return { score: winnerId === challenge.challenger_id ? challenge.challenger_score : challenge.opponent_score, waiting: false, challenge: resolved };
  },

  getPending(userId: number): PvpChallengeWithUsers[] {
    return pvpRepository.findPending(userId);
  },

  getActive(userId: number): PvpChallengeWithUsers[] {
    return pvpRepository.findActive(userId);
  },

  getHistory(userId: number, limit = 20): PvpChallengeWithUsers[] {
    return pvpRepository.findHistory(userId, limit);
  },

  getChallenge(challengeId: number): PvpChallengeWithUsers | undefined {
    return pvpRepository.findById(challengeId);
  },

  searchOpponents(userId: number, query: string): Array<{ id: number; username: string; displayName: string | null }> {
    const user = userRepository.findById(userId);
    if (!user) throw new Error('User not found');

    // Search for students that aren't the current user
    const allUsers = pvpRepository.searchOpponents(userId, query);
    return allUsers;
  },

  expireChallenges(): number {
    const expired = pvpRepository.findExpired();
    for (const challenge of expired) {
      pvpRepository.updateStatus(challenge.id, 'expired');
    }
    return expired.length;
  },
};
