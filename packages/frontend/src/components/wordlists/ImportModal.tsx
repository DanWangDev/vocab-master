import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Upload, FileText, AlertCircle, Download, X } from 'lucide-react';
import { Modal, Button } from '../common';
import ApiService from '../../services/ApiService';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedWord {
  targetWord: string;
  definitions: string[];
  synonyms: string[];
  exampleSentences: string[];
}

interface ParseResult {
  words: ParsedWord[];
  errors: Array<{ row: number; reason: string }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function parseCSV(text: string): ParseResult {
  const lines = text.trim().split('\n');
  const words: ParsedWord[] = [];
  const errors: Array<{ row: number; reason: string }> = [];

  // Skip header row if it looks like a header
  const startIndex = lines[0]?.toLowerCase().includes('word') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(s => s.trim());
    const targetWord = parts[0];

    if (!targetWord) {
      errors.push({ row: i + 1, reason: 'Missing word' });
      continue;
    }

    words.push({
      targetWord,
      definitions: parts[1] ? [parts[1]] : [],
      synonyms: parts[2] ? parts[2].split(';').map(s => s.trim()).filter(Boolean) : [],
      exampleSentences: parts[3] ? [parts[3]] : [],
    });
  }

  return { words, errors };
}

function parseJSON(text: string): ParseResult {
  const errors: Array<{ row: number; reason: string }> = [];
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return { words: [], errors: [{ row: 0, reason: 'Invalid JSON' }] };
  }

  const arr = Array.isArray(data) ? data : [];
  const words: ParsedWord[] = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (!item.targetWord && !item.word) {
      errors.push({ row: i + 1, reason: 'Missing targetWord' });
      continue;
    }

    words.push({
      targetWord: item.targetWord || item.word,
      definitions: Array.isArray(item.definitions) ? item.definitions
        : item.definition ? [item.definition] : [],
      synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
      exampleSentences: Array.isArray(item.exampleSentences) ? item.exampleSentences
        : item.example ? [item.example] : [],
    });
  }

  return { words, errors };
}

export function ImportModal({ isOpen, onClose, onSuccess }: ImportModalProps) {
  const { t } = useTranslation('wordlists');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const resetState = () => {
    setFile(null);
    setName('');
    setDescription('');
    setParseResult(null);
    setLoading(false);
    setError(null);
    setIsDragOver(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const processFile = useCallback((selectedFile: File) => {
    setError(null);

    if (selectedFile.size > MAX_FILE_SIZE) {
      setError('File exceeds 5MB limit');
      return;
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'json') {
      setError('Only CSV and JSON files are accepted');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = ext === 'csv' ? parseCSV(text) : parseJSON(text);
      setParseResult(result);

      if (!name) {
        setName(selectedFile.name.replace(/\.(csv|json)$/i, ''));
      }
    };
    reader.readAsText(selectedFile);
  }, [name]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      processFile(droppedFile);
    }
  };

  const handleSubmit = async () => {
    if (!parseResult || parseResult.words.length === 0 || !name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await ApiService.createWordlist({
        name: name.trim(),
        description: description.trim() || undefined,
        words: parseResult.words,
      });
      onSuccess();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csv = 'word,definition,synonyms,example\nhappy,feeling or showing pleasure,glad;joyful;cheerful,She felt happy about the result\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wordlist_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('importList')} size="lg">
      <div className="space-y-4">
        {/* File drop zone */}
        {!parseResult && (
          <>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                ${isDragOver
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-300 hover:bg-gray-50'
                }
              `}
            >
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">{t('dragDrop')}</p>
              <p className="text-xs text-gray-400 mt-1">{t('acceptedFormats')}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('downloadTemplate')}
            </button>

            <p className="text-xs text-gray-400">{t('csvFormat')}</p>
          </>
        )}

        {/* File selected - show preview */}
        {parseResult && (
          <>
            {file && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <FileText className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 flex-1 truncate">{file.name}</span>
                <button
                  onClick={resetState}
                  className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Name field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')} *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              />
            </div>

            {/* Description field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-400 focus:border-primary-400 outline-none"
              />
            </div>

            {/* Preview */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">{t('preview')}</h3>
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-green-600 font-medium">
                  {t('validWords', { count: parseResult.words.length })}
                </span>
                {parseResult.errors.length > 0 && (
                  <span className="text-sm text-amber-600 font-medium">
                    {t('skippedRows', { count: parseResult.errors.length })}
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('word')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('definitions')}</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">{t('synonyms')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {parseResult.words.slice(0, 10).map((word, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-gray-900">{word.targetWord}</td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[200px]">
                          {word.definitions.join(', ') || '-'}
                        </td>
                        <td className="px-3 py-2 text-gray-600 truncate max-w-[150px]">
                          {word.synonyms.join(', ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.words.length > 10 && (
                  <p className="text-xs text-gray-400 text-center py-2">
                    ...and {parseResult.words.length - 10} more
                  </p>
                )}
              </div>

              {/* Errors */}
              {parseResult.errors.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-bold text-amber-700 mb-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {t('errors')}
                  </h4>
                  <ul className="text-xs text-amber-600 space-y-1 max-h-24 overflow-y-auto">
                    {parseResult.errors.map((err, i) => (
                      <li key={i}>Row {err.row}: {err.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </motion.div>
        )}

        {/* Actions */}
        {parseResult && (
          <div className="flex gap-3 pt-2">
            <Button variant="ghost" fullWidth onClick={handleClose} disabled={loading}>
              {t('cancel')}
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              isLoading={loading}
              disabled={!name.trim() || parseResult.words.length === 0}
            >
              {t('confirm')}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
