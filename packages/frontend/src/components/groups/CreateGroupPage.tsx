import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { groupApi } from '../../services/api/groupApi';

export function CreateGroupPage() {
  const { t } = useTranslation('groups');
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const group = await groupApi.createGroup(name.trim(), description.trim());
      navigate(`/groups/${group.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/groups')} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-gray-800">{t('createGroup')}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1">{t('groupName')}</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t('groupNamePlaceholder')}
            maxLength={100}
            required
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1">{t('description')}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            maxLength={500}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-sky-400 focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || submitting}
          className="w-full py-3 rounded-xl bg-sky-500 text-white font-bold hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? t('creating') : t('create')}
        </button>
      </form>
    </div>
  );
}
