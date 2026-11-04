import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export const PORTAL_SEARCH_DEBOUNCE_MS = 300;

/**
 * A search box for one of the portal's lists. Typing waits a moment, then
 * re-reads only that list's prop from page 1, keeping every other query value
 * (the other list's page, search and size).
 */
export function usePortalSearch(
    searchParam: string,
    pageParam: string,
    only: string,
    queryParams: Record<string, string>,
) {
    const [value, setValue] = useState(queryParams[searchParam] ?? '');
    const applied = useRef(queryParams[searchParam] ?? '');
    const latest = useRef(queryParams);
    latest.current = queryParams;

    useEffect(() => {
        const term = value.trim();
        if (term === applied.current) return;

        const timer = setTimeout(() => {
            applied.current = term;
            const next: Record<string, string> = { ...latest.current };
            delete next[searchParam];
            next[pageParam] = '1';
            if (term) next[searchParam] = term;

            router.get(window.location.pathname, next, {
                preserveScroll: true,
                preserveState: true,
                replace: true,
                only: [only],
            });
        }, PORTAL_SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [value, searchParam, pageParam, only]);

    return [value, setValue] as const;
}
