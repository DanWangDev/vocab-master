import { Volume2 } from 'lucide-react';
import { useSpeechSynthesis } from '../../hooks/useSpeechSynthesis';

interface PronunciationButtonProps {
  word: string;
  lang?: string;
  size?: 'sm' | 'md';
}

export function PronunciationButton({ word, lang = 'en-US', size = 'md' }: PronunciationButtonProps) {
  const { speak, speaking, supported } = useSpeechSynthesis();

  if (!supported) return null;

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const padding = size === 'sm' ? 'p-1.5' : 'p-2';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak(word, lang);
      }}
      className={`
        ${padding} rounded-full transition-colors
        ${speaking
          ? 'bg-blue-100 text-blue-600 animate-pulse'
          : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-500'}
      `}
      aria-label={`Pronounce ${word}`}
      type="button"
    >
      <Volume2 className={iconSize} />
    </button>
  );
}
