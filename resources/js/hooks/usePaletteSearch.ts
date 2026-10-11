import { useEffect, useState } from 'react';
import { PaletteSearchResults, PaletteSearchStatus } from '@/types/Commands';

export const SEARCH_DEBOUNCE_MS = 150;

interface SearchState extends PaletteSearchResults {
    status: PaletteSearchStatus;
}

const IDLE: SearchState = {
    status: 'idle',
    issues: [],
    projects: [],
    people: [],
};

/**
 * Debounced server search for the palette. `query` is already validated for
 * length by `parsePaletteQuery` - `null` sends nothing and clears the results.
 * Every change aborts the in-flight request, and a response is only applied if
 * its request was not aborted, so a stale answer can never overwrite a newer
 * one.
 */
export const usePaletteSearch = (query: string | null): SearchState => {
    const [state, setState] = useState<SearchState>(IDLE);

    useEffect(() => {
        if (query === null) {
            setState(IDLE);
            return;
        }

        setState({ ...IDLE, status: 'loading' });

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            try {
                const response = await fetch(
                    `${route('command-palette.search')}?q=${encodeURIComponent(query)}`,
                    {
                        signal: controller.signal,
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    },
                );

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = (await response.json()) as PaletteSearchResults;
                if (controller.signal.aborted) return;

                setState({
                    status: 'success',
                    issues: data.issues ?? [],
                    projects: data.projects ?? [],
                    people: data.people ?? [],
                });
            } catch {
                if (controller.signal.aborted) return;
                setState({ ...IDLE, status: 'error' });
            }
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [query]);

    return state;
};
