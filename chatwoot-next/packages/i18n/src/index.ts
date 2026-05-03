export const SUPPORTED_LOCALES = [
  'am',
  'ar',
  'az',
  'bg',
  'bn',
  'ca',
  'cs',
  'da',
  'de',
  'el',
  'en',
  'es',
  'et',
  'fa',
  'fi',
  'fr',
  'he',
  'hi',
  'hr',
  'hu',
  'hy',
  'id',
  'it',
  'ja',
  'ka',
  'kn',
  'ko',
  'lt',
  'lv',
  'ml',
  'ne',
  'nl',
  'or',
  'pa',
  'pl',
  'pt',
  'pt_BR',
  'ro',
  'ru',
  'sk',
  'sl',
  'sq',
  'sr',
  'sv',
  'ta',
  'th',
  'tr',
  'uk',
  'ur',
  'vi',
  'zh_CN',
  'zh_TW',
] as const;

export const DEFAULT_LOCALE = 'en';

/**
 * Dynamically import all JSON files under `locale/<code>/*.json`
 * and merge them into a single object keyed by feature (filename) name.
 *
 * TODO: The key namespace strategy here must match the Vue dashboard's
 * vue-i18n loader (see `app/javascript/dashboard/i18n/locale/<code>/index.js`).
 * Today vue-i18n flattens all feature files into a single namespace; this stub
 * preserves the per-feature key so callers can decide how to flatten/merge.
 */
export async function loadLocale(
  locale: string,
): Promise<Record<string, any>> {
  const modules = import.meta.glob('../locale/*/*.json');
  const prefix = `../locale/${locale}/`;
  const merged: Record<string, any> = {};

  for (const path of Object.keys(modules)) {
    if (!path.startsWith(prefix)) continue;
    const feature = path.slice(prefix.length).replace(/\.json$/, '');
    const loader = modules[path];
    if (!loader) continue;
    const mod = (await loader()) as { default?: unknown } | unknown;
    merged[feature] =
      mod && typeof mod === 'object' && 'default' in (mod as object)
        ? (mod as { default: unknown }).default
        : mod;
  }

  return merged;
}

export type { Locale } from './types.js';
