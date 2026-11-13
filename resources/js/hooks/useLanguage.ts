import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useCallback, useMemo } from 'react';
import {
    isSupportedLocale,
    Locale,
    LOCALE_NAMES,
    storeLocale,
    SUPPORTED_LOCALES,
} from '@/utils/locale';

export interface LanguageOption {
    code: Locale;
    /** The language's own name ("Polski"), the same whatever the UI language is. */
    name: string;
}

/**
 * The interface language: the active one, the choices and a setter that also
 * remembers the pick in the browser. The sidebar menu and Settings >
 * Preferences both use it, so a change in one shows in the other at once.
 */
export function useLanguage() {
    const { currentLocale, setLocale } = useLaravelReactI18n();
    const current = currentLocale();
    const locale: Locale = isSupportedLocale(current) ? current : 'en';

    const locales = useMemo(
        (): LanguageOption[] =>
            SUPPORTED_LOCALES.map((code) => ({
                code,
                name: LOCALE_NAMES[code],
            })),
        [],
    );

    const setLanguage = useCallback(
        (next: Locale) => {
            storeLocale(next);
            setLocale(next);
        },
        [setLocale],
    );

    return { locale, locales, setLanguage };
}
