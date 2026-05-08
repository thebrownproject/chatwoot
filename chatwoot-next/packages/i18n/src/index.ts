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
 * Load the merged JSON dictionary for a locale.
 *
 * NOTE: `import.meta.glob` is Vite-specific and is not portable to a plain
 * tsc build. To keep this package bundler-agnostic we ship a stub that
 * returns an empty record. Real implementations live in each consumer:
 *
 *   - apps/web (Next.js): wires this into a `next-intl` request config that
 *     loads `locale/<code>/*.json` from disk at build/runtime.
 *   - apps/widget (Vite): re-implements with `import.meta.glob` for
 *     compile-time inclusion.
 *
 * The key namespace strategy must match the Vue dashboard's vue-i18n loader
 * (see `app/javascript/dashboard/i18n/locale/<code>/index.js`).
 */
export async function loadLocale(
  locale: string,
): Promise<Record<string, unknown>> {
  // TODO: ported to runtime fs-based loader; consumers (Next.js, Vite apps)
  // should use bundler-specific glob if they want compile-time inclusion.
  // Stub: returns empty record. Wired in when Next.js next-intl integration
  // lands.
  void locale;
  return {};
}

export type { Locale } from './types.js';
