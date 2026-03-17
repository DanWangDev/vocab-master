import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { useApp } from '../../contexts/AppContext'

interface LanguageSwitcherProps {
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const appContext = useAppSafe()

  const currentLang = i18n.language?.startsWith('zh') ? 'zh-CN' : 'en'

  const switchLanguage = async (lang: string) => {
    await i18n.changeLanguage(lang)
    localStorage.setItem('vocab_master_language', lang)

    if (appContext) {
      try {
        await appContext.updateSettings({ language: lang })
      } catch {
        // Settings sync failure is non-critical for language switching
      }
    }
  }

  const handleToggle = () => {
    const newLang = currentLang === 'en' ? 'zh-CN' : 'en'
    switchLanguage(newLang)
  }

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-sm"
        title="Switch language"
      >
        <Globe size={14} />
        <span className="font-medium">{currentLang === 'en' ? 'EN' : '中'}</span>
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-primary-500" />
      <div className="flex rounded-lg overflow-hidden border border-primary-200">
        <button
          onClick={() => switchLanguage('en')}
          className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
            currentLang === 'en'
              ? 'bg-primary-500 text-white'
              : 'bg-white text-primary-600 hover:bg-primary-50'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => switchLanguage('zh-CN')}
          className={`px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer ${
            currentLang === 'zh-CN'
              ? 'bg-primary-500 text-white'
              : 'bg-white text-primary-600 hover:bg-primary-50'
          }`}
        >
          中
        </button>
      </div>
    </div>
  )
}

function useAppSafe() {
  try {
    return useApp()
  } catch {
    return null
  }
}

export default LanguageSwitcher
