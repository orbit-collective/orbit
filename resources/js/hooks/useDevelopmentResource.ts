import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DevelopmentResource<T> {
    data: T | null;
    /** True while a request is in flight, including a reload that keeps showing `data`. */
    loading: boolean;
    /** The server's own message (GitHub not reachable, repository not allowed...). */
    error: string | null;
    reload: () => void;
}

/** The message of a failed request: Laravel's validation text, else its message, else the fallback. */
export function requestErrorMessage(error: unknown, fallback: string): string {
    const data = (
        error as {
            response?: {
                data?: {
                    message?: string;
                    errors?: Record<string, string[]>;
                };
            };
        }
    )?.response?.data;
    const first = data?.errors
        ? Object.values(data.errors).flat()[0]
        : undefined;

    return first ?? data?.message ?? fallback;
}

/**
 * Reads one JSON resource of the Development view. A change of `url` or
 * `params` aborts the request in flight and starts a new one, a late answer
 * of an aborted request never lands, and what was shown stays on screen while
 * the next answer is on its way (so a reload or a page change does not blank
 * the panel). `params === null` means "not ready": nothing is requested and
 * what was shown is dropped.
 *
 * `paramsKey` is how callers say "the params changed" without having to keep
 * the object itself stable.
 */
export function useDevelopmentResource<T>(
    url: string,
    params: Record<string, string | number | undefined> | null,
    fallbackError: string,
): DevelopmentResource<T> {
    // What arrived is remembered with the request it answers. A reload of the
    // same request keeps showing it while the next answer is on its way; a
    // different request (another repository) never shows the old answer, not
    // even for the render before its own effect runs.
    const [result, setResult] = useState<{
        key: string;
        data: T | null;
        error: string | null;
    } | null>(null);
    const [fetching, setFetching] = useState(params !== null);
    const [reloads, setReloads] = useState(0);
    const fallback = useRef(fallbackError);
    fallback.current = fallbackError;

    const paramsKey = params === null ? null : JSON.stringify(params);
    const requestKey = paramsKey === null ? null : `${url}?${paramsKey}`;
    const current = result && result.key === requestKey ? result : null;

    useEffect(() => {
        if (paramsKey === null || requestKey === null) {
            setResult(null);
            setFetching(false);
            return;
        }

        const controller = new AbortController();
        setFetching(true);

        axios
            .get<T>(url, {
                params: JSON.parse(paramsKey),
                signal: controller.signal,
            })
            .then((response) => {
                if (controller.signal.aborted) return;
                setResult({
                    key: requestKey,
                    data: response.data,
                    error: null,
                });
            })
            .catch((failure) => {
                if (controller.signal.aborted || axios.isCancel?.(failure)) {
                    return;
                }
                setResult((previous) => ({
                    key: requestKey,
                    // A failed reload keeps what was shown.
                    data: previous?.key === requestKey ? previous.data : null,
                    error: requestErrorMessage(failure, fallback.current),
                }));
            })
            .finally(() => {
                if (!controller.signal.aborted) setFetching(false);
            });

        return () => controller.abort();
    }, [url, paramsKey, requestKey, reloads]);

    const data = current?.data ?? null;
    const error = current?.error ?? null;
    // Not ready for this request yet (its effect has not run) also counts as loading.
    const loading = paramsKey !== null && (fetching || current === null);

    const reload = useCallback(() => setReloads((count) => count + 1), []);

    return { data, loading, error, reload };
}
