import { createI18n } from 'vue-i18n';
import zh from './zh';
import en from './en';

const LANG_STORAGE_KEY = 'app_language';

/** 读取本地持久化的语言偏好，默认 zh */
export function getStoredLang(): 'zh' | 'en' {
  try {
    const lang = uni.getStorageSync(LANG_STORAGE_KEY);
    if (lang === 'en' || lang === 'zh') return lang;
  } catch (_) {}
  return 'zh';
}

/** 持久化语言偏好 */
export function setStoredLang(lang: 'zh' | 'en') {
  uni.setStorageSync(LANG_STORAGE_KEY, lang);
}

/** 是否已选择过语言（首次进入判断） */
export function hasChosenLang(): boolean {
  try {
    return !!uni.getStorageSync(LANG_STORAGE_KEY);
  } catch (_) {
    return false;
  }
}

const i18n = createI18n({
  legacy: false, // Composition API 模式
  locale: getStoredLang(),
  fallbackLocale: 'zh',
  messages: { zh, en },
});

export default i18n;
