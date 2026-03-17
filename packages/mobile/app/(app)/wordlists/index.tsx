import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Modal, Alert,
  RefreshControl, TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import {
  List, Plus, Trash2, Check, Lock, Globe, X, FileText, Upload,
} from 'lucide-react-native';
import { useApp } from '../../../src/contexts/AppContext';
import { ApiService } from '../../../src/services/ApiService';
import { Button } from '../../../src/components/common';
import { OfflineIndicator } from '../../../src/components/common/OfflineIndicator';
import { colors } from '../../../src/theme/colors';
import type { Wordlist, CreateWordlistRequest } from '@vocab-master/shared';

interface ParsedWord {
  targetWord: string;
  definitions: string[];
  synonyms: string[];
  exampleSentences: string[];
}

function parseCSV(text: string): { words: ParsedWord[]; errors: string[] } {
  const lines = text.trim().split('\n');
  const words: ParsedWord[] = [];
  const errors: string[] = [];

  const startIndex = lines.length > 0 && lines[0].toLowerCase().includes('word') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 2) {
      errors.push(`Row ${i + 1}: needs at least word and definition`);
      continue;
    }

    words.push({
      targetWord: parts[0],
      definitions: parts[1].split(';').map(d => d.trim()).filter(Boolean),
      synonyms: parts[2] ? parts[2].split(';').map(s => s.trim()).filter(Boolean) : [],
      exampleSentences: parts[3] ? [parts[3]] : [],
    });
  }

  return { words, errors };
}

function parseJSON(text: string): { words: ParsedWord[]; errors: string[] } {
  const errors: string[] = [];
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.words || [];

    const words: ParsedWord[] = arr.map((item: Record<string, unknown>, i: number) => {
      const word = (item.targetWord || item.word || '') as string;
      if (!word) {
        errors.push(`Item ${i + 1}: missing word`);
      }

      const defs = item.definitions || item.definition;
      const syns = item.synonyms || item.synonym;
      const exs = item.exampleSentences || item.examples || item.example;

      return {
        targetWord: word,
        definitions: Array.isArray(defs) ? defs : typeof defs === 'string' ? [defs] : [],
        synonyms: Array.isArray(syns) ? syns : typeof syns === 'string' ? [syns] : [],
        exampleSentences: Array.isArray(exs) ? exs : typeof exs === 'string' ? [exs] : [],
      };
    }).filter((w: ParsedWord) => w.targetWord);

    return { words, errors };
  } catch {
    return { words: [], errors: ['Invalid JSON format'] };
  }
}

export default function WordlistsScreen() {
  const { t } = useTranslation('wordlists');
  const { activeWordlist, switchWordlist } = useApp();
  const [wordlists, setWordlists] = useState<Wordlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [switching, setSwitching] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Wordlist | null>(null);

  const loadWordlists = useCallback(async () => {
    try {
      const data = await ApiService.getWordlists();
      setWordlists(data.wordlists);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWordlists();
  }, [loadWordlists]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadWordlists();
    setRefreshing(false);
  }, [loadWordlists]);

  const handleSwitch = useCallback(async (wordlistId: number) => {
    if (activeWordlist?.id === wordlistId) return;
    setSwitching(wordlistId);
    try {
      await switchWordlist(wordlistId);
    } catch {
      Alert.alert(t('error', 'Error'), t('switchFailed', 'Failed to switch wordlist'));
    } finally {
      setSwitching(null);
    }
  }, [activeWordlist, switchWordlist, t]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await ApiService.deleteWordlist(id);
      setDeleting(null);
      loadWordlists();
    } catch {
      Alert.alert(t('error', 'Error'), t('deleteFailed', 'Failed to delete wordlist'));
    }
  }, [loadWordlists, t]);

  const userLists = wordlists.filter(w => !w.isSystem);
  const systemLists = wordlists.filter(w => w.isSystem);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <OfflineIndicator />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <View className="flex-row items-center gap-2">
          <List size={24} color={colors.primary[600]} />
          <Text className="text-xl font-nunito-bold text-gray-900">
            {t('manageWordlists', 'Wordlists')}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowImport(true)}
          className="w-10 h-10 items-center justify-center rounded-full bg-primary-100"
        >
          <Plus size={20} color={colors.primary[600]} />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 p-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View className="items-center py-12">
            <Text className="text-gray-500 font-nunito">{t('loading', 'Loading...')}</Text>
          </View>
        ) : (
          <>
            {/* User wordlists */}
            {userLists.length > 0 && (
              <View className="mb-6">
                <Text className="text-sm font-nunito-bold text-gray-500 uppercase tracking-wide mb-3">
                  {t('myWordlists', 'My Wordlists')}
                </Text>
                <View className="gap-2">
                  {userLists.map((wl, index) => (
                    <WordlistItem
                      key={wl.id}
                      wordlist={wl}
                      isActive={activeWordlist?.id === wl.id}
                      isSwitching={switching === wl.id}
                      index={index}
                      onSelect={() => handleSwitch(wl.id)}
                      onDelete={() => setDeleting(wl)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* System wordlists */}
            <View className="mb-6">
              <Text className="text-sm font-nunito-bold text-gray-500 uppercase tracking-wide mb-3">
                {t('systemWordlists', 'System Wordlists')}
              </Text>
              <View className="gap-2">
                {systemLists.map((wl, index) => (
                  <WordlistItem
                    key={wl.id}
                    wordlist={wl}
                    isActive={activeWordlist?.id === wl.id}
                    isSwitching={switching === wl.id}
                    index={index}
                    onSelect={() => handleSwitch(wl.id)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Import Modal */}
      <ImportModal
        visible={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => {
          loadWordlists();
          setShowImport(false);
        }}
      />

      {/* Delete Confirm */}
      {deleting && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setDeleting(null)}>
          <View className="flex-1 bg-black/50 items-center justify-center p-6">
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm">
              <View className="items-center mb-4">
                <Trash2 size={32} color={colors.error} />
                <Text className="text-lg font-nunito-bold text-gray-900 mt-3">
                  {t('confirmDelete', 'Delete Wordlist?')}
                </Text>
                <Text className="text-sm text-gray-500 font-nunito text-center mt-2">
                  "{deleting.name}" ({deleting.wordCount} {t('words', 'words')})
                </Text>
              </View>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => setDeleting(null)}
                  className="flex-1 py-3 items-center bg-gray-100 rounded-xl"
                >
                  <Text className="font-nunito-bold text-gray-600">{t('cancel', 'Cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDelete(deleting.id)}
                  className="flex-1 py-3 items-center bg-red-500 rounded-xl"
                >
                  <Text className="font-nunito-bold text-white">{t('delete', 'Delete')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function WordlistItem({
  wordlist,
  isActive,
  isSwitching,
  index,
  onSelect,
  onDelete,
}: {
  wordlist: Wordlist;
  isActive: boolean;
  isSwitching: boolean;
  index: number;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation('wordlists');
  const VisIcon = wordlist.isSystem ? Globe : Lock;

  return (
    <Animated.View entering={FadeInDown.delay(index * 60)}>
      <Pressable
        onPress={onSelect}
        disabled={isSwitching}
        className={`bg-white rounded-2xl p-4 border-2 ${
          isActive ? 'border-primary-500' : 'border-gray-100'
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center gap-3">
            <View className={`w-10 h-10 rounded-full items-center justify-center ${
              isActive ? 'bg-primary-100' : 'bg-gray-100'
            }`}>
              {isActive ? (
                <Check size={20} color={colors.primary[600]} />
              ) : (
                <VisIcon size={18} color={colors.gray[400]} />
              )}
            </View>
            <View className="flex-1">
              <Text className={`font-nunito-bold ${
                isActive ? 'text-primary-700' : 'text-gray-900'
              }`}>
                {wordlist.name}
              </Text>
              <Text className="text-xs text-gray-400 font-nunito">
                {wordlist.wordCount} {t('words', 'words')}
                {wordlist.description ? ` · ${wordlist.description}` : ''}
              </Text>
            </View>
          </View>

          {onDelete && !isActive && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              className="p-2"
            >
              <Trash2 size={16} color={colors.gray[400]} />
            </Pressable>
          )}
        </View>

        {isSwitching && (
          <Text className="text-xs text-primary-500 font-nunito mt-2">
            {t('switching', 'Switching...')}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

function ImportModal({
  visible,
  onClose,
  onImported,
}: {
  visible: boolean;
  onClose: () => void;
  onImported: () => void;
}) {
  const { t } = useTranslation('wordlists');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [words, setWords] = useState<ParsedWord[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importError, setImportError] = useState('');

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/json', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (asset.size && asset.size > 5 * 1024 * 1024) {
        setImportError(t('fileTooLarge', 'File must be under 5MB'));
        return;
      }

      const content = await FileSystem.readAsStringAsync(asset.uri);
      setFileName(asset.name);

      const isJson = asset.name.endsWith('.json') || content.trim().startsWith('[') || content.trim().startsWith('{');
      const parsed = isJson ? parseJSON(content) : parseCSV(content);

      setWords(parsed.words);
      setErrors(parsed.errors);
      setImportError('');

      if (parsed.words.length === 0) {
        setImportError(t('noWordsFound', 'No valid words found in file'));
      }
    } catch {
      setImportError(t('fileReadError', 'Failed to read file'));
    }
  };

  const handleImport = async () => {
    if (!name.trim()) {
      setImportError(t('nameRequired', 'Name is required'));
      return;
    }
    if (words.length === 0) {
      setImportError(t('noWords', 'No words to import'));
      return;
    }

    setLoading(true);
    setImportError('');
    try {
      const request: CreateWordlistRequest = {
        name: name.trim(),
        description: description.trim(),
        words: words.map((w, i) => ({
          targetWord: w.targetWord,
          definitions: w.definitions,
          synonyms: w.synonyms,
          exampleSentences: w.exampleSentences,
          sortOrder: i,
        })),
      };

      await ApiService.createWordlist(request);
      onImported();
      setName('');
      setDescription('');
      setWords([]);
      setFileName(null);
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : t('importFailed', 'Import failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <Text className="text-lg font-nunito-bold text-gray-900">
            {t('importWordlist', 'Import Wordlist')}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={colors.gray[600]} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {importError !== '' && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-700 font-nunito text-sm">{importError}</Text>
            </View>
          )}

          <Text className="text-sm font-nunito-bold text-gray-600 mb-1">
            {t('wordlistName', 'Name')}
          </Text>
          <RNTextInput
            value={name}
            onChangeText={setName}
            placeholder={t('namePlaceholder', 'My Vocabulary List')}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-nunito"
          />

          <Text className="text-sm font-nunito-bold text-gray-600 mb-1">
            {t('description', 'Description (optional)')}
          </Text>
          <RNTextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t('descriptionPlaceholder', 'Optional description')}
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 font-nunito"
          />

          {/* File picker */}
          <Pressable
            onPress={pickFile}
            className="items-center justify-center py-8 bg-white border-2 border-dashed border-gray-300 rounded-2xl mb-4"
          >
            <Upload size={32} color={colors.gray[400]} />
            <Text className="text-gray-500 font-nunito-bold mt-3">
              {fileName || t('selectFile', 'Select CSV or JSON file')}
            </Text>
            <Text className="text-xs text-gray-400 font-nunito mt-1">
              {t('fileFormats', 'CSV or JSON format')}
            </Text>
          </Pressable>

          {/* Preview */}
          {words.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-nunito-bold text-gray-600 mb-2">
                {t('preview', 'Preview')} ({words.length} {t('words', 'words')})
              </Text>
              <View className="bg-white rounded-xl border border-gray-200">
                {words.slice(0, 5).map((w, i) => (
                  <View
                    key={i}
                    className={`flex-row items-center p-3 ${
                      i < Math.min(words.length, 5) - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <FileText size={14} color={colors.gray[400]} />
                    <Text className="font-nunito-bold text-gray-800 ml-2 flex-1">
                      {w.targetWord}
                    </Text>
                    <Text className="text-xs text-gray-400 font-nunito" numberOfLines={1}>
                      {w.definitions.join(', ')}
                    </Text>
                  </View>
                ))}
                {words.length > 5 && (
                  <View className="p-3 items-center">
                    <Text className="text-xs text-gray-400 font-nunito">
                      +{words.length - 5} {t('more', 'more')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
              <Text className="text-sm font-nunito-bold text-amber-700 mb-1">
                {t('parseErrors', 'Parse Warnings')}
              </Text>
              {errors.slice(0, 3).map((err, i) => (
                <Text key={i} className="text-xs text-amber-600 font-nunito">{err}</Text>
              ))}
            </View>
          )}

          <Button
            onPress={handleImport}
            color={colors.primary[600]}
            disabled={loading || words.length === 0 || !name.trim()}
          >
            <Text className="text-white font-nunito-bold text-base text-center">
              {loading
                ? t('importing', 'Importing...')
                : t('importWords', 'Import {{count}} Words', { count: words.length })}
            </Text>
          </Button>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
