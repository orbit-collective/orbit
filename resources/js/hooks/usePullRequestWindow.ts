import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestErrorMessage } from '@/hooks/useDevelopmentResource';
import { DevelopmentPullRequest } from '@/types/Development';

/** GitHub's largest page: the fewest requests for a long range. */
export const PULL_REQUEST_PAGE = 100;

interface PullRequestWindow {
    /** Everything read so far; `null` until the first page is there. */
    pullRequests: DevelopmentPullRequest[] | null;
    /** True while the first page of a new request is on its way. */
    loading: boolean;
    /** True while later pages are being read behind the ones already shown. */
    loadingMore: boolean;
    /** The range holds more than `limit` allows: what is shown is the newest of it. */
    capped: boolean;
    error: string | null;
    reload: () => void;
}

interface Result {
    key: string;
    pullRequests: DevelopmentPullRequest[];
    capped: boolean;
    error: string | null;
}

/**
 * Reads a repository's pull requests inside a time range, a page at a time,
 * newest update first. The first page is shown as soon as it arrives and the
 * rest is read behind it (until the range is exhausted or `limit` is reached),
 * so a long range does not make the view wait for everything. A different
 * request (another repository, range or limit) never shows the old answer; a
 * reload of the same one keeps it until the first new page replaces it.
 * `params === null` means "not wanted": nothing is requested.
 */
export function usePullRequestWindow(
    url: string,
    params: {
        repository_id: number;
        state: string;
        since?: string;
        limit: number;
    } | null,
    fallbackError: string,
): PullRequestWindow {
    const [result, setResult] = useState<Result | null>(null);
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

        const { limit, ...query } = JSON.parse(paramsKey) as {
            limit: number;
        } & Record<string, string | number>;
        const controller = new AbortController();
        setFetching(true);

        (async () => {
            let collected: DevelopmentPullRequest[] = [];
            let page = 1;

            try {
                for (;;) {
                    const { data } = await axios.get<{
                        pullRequests: DevelopmentPullRequest[];
                        hasMore: boolean;
                    }>(url, {
                        params: { ...query, page, per_page: PULL_REQUEST_PAGE },
                        signal: controller.signal,
                    });
                    if (controller.signal.aborted) return;

                    collected = [...collected, ...data.pullRequests];
                    const capped = data.hasMore && collected.length >= limit;
                    const shown = collected.slice(0, limit);

                    setResult({
                        key: requestKey,
                        pullRequests: shown,
                        capped,
                        error: null,
                    });

                    if (!data.hasMore || collected.length >= limit) break;
                    page += 1;
                }
            } catch (failure) {
                if (controller.signal.aborted || axios.isCancel?.(failure)) {
                    return;
                }

                // A failed later page keeps what was read; a failed first page has nothing to keep.
                setResult((previous) => ({
                    key: requestKey,
                    pullRequests:
                        previous?.key === requestKey
                            ? previous.pullRequests
                            : collected,
                    capped: false,
                    error: requestErrorMessage(failure, fallback.current),
                }));
            } finally {
                if (!controller.signal.aborted) setFetching(false);
            }
        })();

        return () => controller.abort();
    }, [url, paramsKey, requestKey, reloads]);

    const reload = useCallback(() => setReloads((count) => count + 1), []);
    const pullRequests =
        current && (current.pullRequests.length > 0 || current.error === null)
            ? current.pullRequests
            : null;

    return {
        pullRequests,
        loading: paramsKey !== null && pullRequests === null && fetching,
        loadingMore: paramsKey !== null && pullRequests !== null && fetching,
        capped: current?.capped ?? false,
        error: current?.error ?? null,
        reload,
    };
}
