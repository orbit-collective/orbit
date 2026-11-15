import { useCallback, useState } from 'react';

/**
 * A choice out of a fixed list that is remembered in this browser (a layout,
 * a tab). A stored value that is no longer one of `allowed`, and storage that
 * is missing or blocked, fall back to `initial`: remembering is a convenience
 * only.
 */
export function useStoredChoice<T extends string>(
    storageKey: string,
    initial: T,
    allowed: readonly T[],
) {
    const [value, setValue] = useState<T>(() => {
        try {
            const stored = localStorage.getItem(storageKey);

            return allowed.includes(stored as T) ? (stored as T) : initial;
        } catch {
            return initial;
        }
    });

    const choose = useCallback(
        (next: T) => {
            setValue(next);

            try {
                localStorage.setItem(storageKey, next);
            } catch {
                // Not remembered, still applied.
            }
        },
        [storageKey],
    );

    return [value, choose] as const;
}
