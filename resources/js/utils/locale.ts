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

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

/**
 * The server reads the language from this cookie (validation errors and flash
 * messages are translated there), so it has to follow every change.
 */
const writeLocaleCookie = (locale: Locale): void => {
    document.cookie = `${LOCALE_STORAGE_KEY}=${locale}; path=/; max-age=${ONE_YEAR_IN_SECONDS}; SameSite=Lax`;
};

export const storeLocale = (locale: Locale): void => {
    try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
        // Storage can be blocked; the choice then lasts for this visit only.
    }

    writeLocaleCookie(locale);
};
