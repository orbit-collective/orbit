import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { requestErrorMessage } from '@/hooks/useDevelopmentResource';
import { DevelopmentPullRequest } from '@/types/Development';

/** GitHub's largest page: the fewest requests for a long range. */
const PULL_REQUEST_PAGE = 100;

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
    /** Reads everything again (the whole range, page by page). */
    reload: () => void;
    /**
     * Reads only the newest page and folds it into what is shown: a changed
     * pull request is replaced, a new one comes first, the rest stays as it is.
     * What a write or a live change needs, instead of reading the whole range.
     */
    refreshFirstPage: () => void;
    /** Changes one pull request in what is shown right away (before GitHub is asked). */
    patch: (number: number, changes: Partial<DevelopmentPullRequest>) => void;
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

    // The pieces the light refresh needs, kept in refs so it stays one stable function.
    const query = useRef({ url, paramsKey });
    query.current = { url, paramsKey };
    const keyRef = useRef(requestKey);
    keyRef.current = requestKey;

    const patch = useCallback(
        (number: number, changes: Partial<DevelopmentPullRequest>) =>
            setResult((previous) =>
                previous === null
                    ? previous
                    : {
                          ...previous,
                          pullRequests: previous.pullRequests.map((pr) =>
                              pr.number === number ? { ...pr, ...changes } : pr,
                          ),
                      },
            ),
        [],
    );

    const refreshFirstPage = useCallback(() => {
        const { url: current, paramsKey: currentParams } = query.current;
        const startedFor = keyRef.current;
        if (currentParams === null || startedFor === null) return;

        const { limit, ...rest } = JSON.parse(currentParams) as {
            limit: number;
        } & Record<string, string | number>;

        axios
            .get<{ pullRequests: DevelopmentPullRequest[] }>(current, {
                params: { ...rest, page: 1, per_page: PULL_REQUEST_PAGE },
            })
            .then(({ data }) =>
                setResult((previous) => {
                    // The person moved on (another repository or range) meanwhile.
                    if (!previous || previous.key !== startedFor)
                        return previous;

                    const fresh = new Map(
                        data.pullRequests.map((pr) => [pr.number, pr]),
                    );
                    // The pull requests of the fresh page come first, in its order;
                    // the older ones it does not hold keep their place after them.
                    const rest_ = previous.pullRequests.filter(
                        (pr) => !fresh.has(pr.number),
                    );

                    return {
                        ...previous,
                        pullRequests: [...data.pullRequests, ...rest_].slice(
                            0,
                            limit,
                        ),
                    };
                }),
            )
            .catch(() => {
                // A light refresh that fails leaves what is shown; the next change or poll tries again.
            });
    }, []);
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
        refreshFirstPage,
        patch,
    };
}
