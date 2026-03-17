/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Format time for display (mm:ss)
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format time for display (just seconds with decimal)
 */
export function formatSeconds(seconds: number): string {
  return seconds.toFixed(1);
}

/**
 * Check if answer is correct (case-insensitive, trimmed)
 */
export function isAnswerCorrect(input: string, target: string): boolean {
  return input.trim().toLowerCase() === target.trim().toLowerCase();
}

/**
 * Check if multi-select answers are all correct (all-or-nothing)
 * Must select ALL correct answers and NO incorrect ones
 */
export function isMultiSelectCorrect(
  selected: string[],
  correct: string[]
): boolean {
  if (selected.length !== correct.length) return false;

  const normalizedSelected = selected.map(s => s.trim().toLowerCase()).sort();
  const normalizedCorrect = correct.map(c => c.trim().toLowerCase()).sort();

  return normalizedSelected.every((s, i) => s === normalizedCorrect[i]);
}

/**
 * Get today's date as string (YYYY-MM-DD)
 */
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
