import { useCallback, useState } from 'react';
import {
    DEFAULT_SETTINGS,
    DevelopmentSettings,
    SETTINGS_STORAGE_KEY,
    normalizeSettings,
} from '@/utils/developmentSettings';

const load = (): DevelopmentSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);

        return normalizeSettings(stored ? JSON.parse(stored) : null);
    } catch {
        return DEFAULT_SETTINGS;
    }
};

/**
 * The person's display settings for the Development view, remembered in this
 * browser. Remembering is a convenience: with storage missing or blocked the
 * settings still apply for as long as the page lives.
 */
export function useDevelopmentSettings() {
    const [settings, setSettings] = useState<DevelopmentSettings>(load);

    const save = useCallback((next: DevelopmentSettings) => {
        setSettings(next);

        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Not remembered, still applied.
        }
    }, []);

    const update = useCallback(
        (changes: Partial<DevelopmentSettings>) =>
            setSettings((current) => {
                const next = normalizeSettings({ ...current, ...changes });

                try {
                    localStorage.setItem(
                        SETTINGS_STORAGE_KEY,
                        JSON.stringify(next),
                    );
                } catch {
                    // Not remembered, still applied.
                }

                return next;
            }),
        [],
    );

    const reset = useCallback(() => save(DEFAULT_SETTINGS), [save]);

    return { settings, update, reset };
}
