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
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(params !== null);
    const [error, setError] = useState<string | null>(null);
    const [reloads, setReloads] = useState(0);
    const fallback = useRef(fallbackError);
    fallback.current = fallbackError;

    const paramsKey = params === null ? null : JSON.stringify(params);

    useEffect(() => {
        if (paramsKey === null) {
            setData(null);
            setError(null);
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        axios
            .get<T>(url, {
                params: JSON.parse(paramsKey),
                signal: controller.signal,
            })
            .then((response) => {
                if (controller.signal.aborted) return;
                setData(response.data);
            })
            .catch((failure) => {
                if (controller.signal.aborted || axios.isCancel?.(failure)) {
                    return;
                }
                setError(requestErrorMessage(failure, fallback.current));
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [url, paramsKey, reloads]);

    const reload = useCallback(() => setReloads((count) => count + 1), []);

    return { data, loading, error, reload };
}
