import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CiSummary } from '@/types/Development';

/** What orbit-api takes in one call. */
const BATCH_SIZE = 20;

/** How often checks that are still running are asked about again. */
export const CI_POLL_MS = 12_000;

/** A run that is still "running" after this long is left alone until something says otherwise. */
const CI_POLL_GIVE_UP_MS = 20 * 60 * 1000;

interface CiSummaries {
    /** By commit sha; `null` means GitHub could not say. A sha that is missing has not arrived yet. */
    summaries: Record<string, CiSummary | null>;
    /** The asked-for shas that have not arrived yet. */
    pending: Set<string>;
    /**
     * Asks again for every sha in view while keeping what is shown, so
     * nothing flashes back to a placeholder (a live change to the checks).
     */
    refresh: () => void;
    /** Records a result that arrived another way (a pull request's own detail is read fresh). */
    set: (sha: string, summary: CiSummary | null) => void;
}

/**
 * The CI of the commits a view is showing, read in batches of at most twenty
 * and only for the ones not known yet, so paging back to a page already seen
 * costs nothing. A change of `scope` (another repository) starts from nothing.
 * A batch that fails marks its shas as unknown (`null`) rather than retrying
 * forever. A commit whose checks are still running is asked about again every
 * few seconds (a result that stayed "running" after it finished was the way
 * the list used to disagree with the detail), and `set()` lets the detail
 * correct the list the moment it knows better.
 */
export function useCiSummaries(
    url: string,
    repositoryId: number,
    shas: string[],
    enabled = true,
): CiSummaries {
    const [state, setState] = useState<{
        scope: string;
        summaries: Record<string, CiSummary | null>;
    }>({ scope: '', summaries: {} });
    const requested = useRef(new Set<string>());
    const startedAt = useRef<Record<string, number>>({});
    const scope = `${url}|${repositoryId}`;
    const shasKey = [...new Set(shas)].sort().join(',');
    const latest = useRef({
        scope,
        state,
        shasKey,
        enabled,
        url,
        repositoryId,
    });
    latest.current = { scope, state, shasKey, enabled, url, repositoryId };

    useEffect(() => {
        // A new scope drops what was known and what was being asked.
        requested.current = new Set();
        startedAt.current = {};
        setState({ scope, summaries: {} });
    }, [scope]);

    /** Reads these shas now (in batches), keeping whatever is shown until the answer is in. */
    const fetchShas = useCallback((wanted: string[], signal?: AbortSignal) => {
        const {
            scope: forScope,
            url: forUrl,
            repositoryId: forRepo,
        } = latest.current;

        for (let start = 0; start < wanted.length; start += BATCH_SIZE) {
            const batch = wanted.slice(start, start + BATCH_SIZE);

            axios
                .get<{ checks: Record<string, CiSummary | null> }>(forUrl, {
                    params: { repository_id: forRepo, refs: batch },
                    signal,
                })
                .then(({ data }) => {
                    if (signal?.aborted) return;
                    setState((current) =>
                        current.scope !== forScope
                            ? current
                            : {
                                  scope: forScope,
                                  summaries: {
                                      ...current.summaries,
                                      ...Object.fromEntries(
                                          batch.map((sha) => [
                                              sha,
                                              data.checks[sha] ?? null,
                                          ]),
                                      ),
                                  },
                              },
                    );
                })
                .catch(() => {
                    if (signal?.aborted) {
                        // Asked again by the next run.
                        batch.forEach((sha) => requested.current.delete(sha));
                        return;
                    }
                    // A failed batch: unknown, unless there is something older to keep.
                    setState((current) =>
                        current.scope !== forScope
                            ? current
                            : {
                                  scope: forScope,
                                  summaries: {
                                      ...Object.fromEntries(
                                          batch
                                              .filter(
                                                  (sha) =>
                                                      !(
                                                          sha in
                                                          current.summaries
                                                      ),
                                              )
                                              .map((sha) => [sha, null]),
                                      ),
                                      ...current.summaries,
                                  },
                              },
                    );
                });
        }
    }, []);

    // The shas in view that have not been asked for yet.
    useEffect(() => {
        if (!enabled || shasKey === '') return;

        const missing = shasKey
            .split(',')
            .filter((sha) => !requested.current.has(sha));
        if (missing.length === 0) return;

        missing.forEach((sha) => {
            requested.current.add(sha);
            startedAt.current[sha] ??= Date.now();
        });
        const controller = new AbortController();
        fetchShas(missing, controller.signal);

        return () => controller.abort();
    }, [enabled, shasKey, scope, fetchShas]);

    const summaries = state.scope === scope ? state.summaries : {};
    const summariesRef = useRef(summaries);
    summariesRef.current = summaries;

    // Checks that are still running are asked about again until they finish.
    useEffect(() => {
        if (!enabled) return;

        const id = setInterval(() => {
            if (
                typeof document !== 'undefined' &&
                document.visibilityState === 'hidden'
            ) {
                return;
            }

            const running = latest.current.shasKey
                .split(',')
                .filter(
                    (sha) =>
                        summariesRef.current[sha]?.state === 'pending' &&
                        Date.now() - (startedAt.current[sha] ?? 0) <
                            CI_POLL_GIVE_UP_MS,
                );
            if (running.length > 0) fetchShas(running);
        }, CI_POLL_MS);

        return () => clearInterval(id);
    }, [enabled, fetchShas]);

    const pending = useMemo(
        () =>
            new Set(
                enabled && shasKey !== ''
                    ? shasKey.split(',').filter((sha) => !(sha in summaries))
                    : [],
            ),
        [enabled, shasKey, summaries],
    );

    const refresh = useCallback(() => {
        const { enabled: on, shasKey: key } = latest.current;
        if (!on || key === '') return;

        key.split(',').forEach((sha) => {
            startedAt.current[sha] = Date.now();
        });
        fetchShas(key.split(','));
    }, [fetchShas]);

    const set = useCallback(
        (sha: string, summary: CiSummary | null) =>
            setState((current) =>
                current.scope !== latest.current.scope
                    ? current
                    : {
                          scope: current.scope,
                          summaries: { ...current.summaries, [sha]: summary },
                      },
            ),
        [],
    );

    return { summaries, pending, refresh, set };
}
