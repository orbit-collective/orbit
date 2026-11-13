export const SUPPORTED_LOCALES = ['en', 'pl'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_STORAGE_KEY = 'locale';

export const LOCALE_NAMES: Record<Locale, string> = {
    en: 'English',
    pl: 'Polski',
};

export const isSupportedLocale = (value: unknown): value is Locale =>
    SUPPORTED_LOCALES.includes(value as Locale);

/** The language the user picked last (kept in the browser), else English. */
export const getStoredLocale = (): Locale => {
    try {
        const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

        return isSupportedLocale(stored) ? stored : DEFAULT_LOCALE;
    } catch {
        return DEFAULT_LOCALE;
    }
};

export const storeLocale = (locale: Locale): void => {
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        // Storage can be blocked; the choice then lasts for this visit only.
    }
};
