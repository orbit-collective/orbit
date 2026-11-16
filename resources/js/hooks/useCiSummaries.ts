import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CiSummary } from '@/types/Development';

/** What orbit-api takes in one call. */
const BATCH_SIZE = 20;

interface CiSummaries {
    /** By commit sha; `null` means GitHub could not say. A sha that is missing has not arrived yet. */
    summaries: Record<string, CiSummary | null>;
    /** The asked-for shas that have not arrived yet. */
    pending: Set<string>;
    /** Forgets everything and asks again (after a change). */
    reload: () => void;
}

/**
 * The CI of the commits a view is showing, read in batches of at most twenty
 * and only for the ones not known yet, so paging back to a page already seen
 * costs nothing. A change of `scope` (another repository) starts from nothing.
 * A batch that fails marks its shas as unknown (`null`) rather than retrying
 * forever.
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
    const [reloads, setReloads] = useState(0);
    const requested = useRef(new Set<string>());
    const scope = `${url}|${repositoryId}|${reloads}`;
    const shasKey = [...new Set(shas)].sort().join(',');

    useEffect(() => {
        // A new scope drops what was known and what was being asked.
        requested.current = new Set();
        setState({ scope, summaries: {} });
    }, [scope]);

    useEffect(() => {
        if (!enabled || shasKey === '') return;

        const missing = shasKey
            .split(',')
            .filter((sha) => !requested.current.has(sha));
        if (missing.length === 0) return;

        missing.forEach((sha) => requested.current.add(sha));
        const controller = new AbortController();

        for (let start = 0; start < missing.length; start += BATCH_SIZE) {
            const batch = missing.slice(start, start + BATCH_SIZE);

            axios
                .get<{ checks: Record<string, CiSummary | null> }>(url, {
                    params: { repository_id: repositoryId, refs: batch },
                    signal: controller.signal,
                })
                .then(({ data }) => {
                    if (controller.signal.aborted) return;
                    setState((current) =>
                        current.scope !== scope
                            ? current
                            : {
                                  scope,
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
                    if (controller.signal.aborted) {
                        // Asked again by the next run.
                        batch.forEach((sha) => requested.current.delete(sha));
                        return;
                    }
                    setState((current) =>
                        current.scope !== scope
                            ? current
                            : {
                                  scope,
                                  summaries: {
                                      ...current.summaries,
                                      ...Object.fromEntries(
                                          batch.map((sha) => [sha, null]),
                                      ),
                                  },
                              },
                    );
                });
        }

        return () => controller.abort();
    }, [enabled, shasKey, url, repositoryId, scope]);

    const summaries = state.scope === scope ? state.summaries : {};
    const pending = useMemo(
        () =>
            new Set(
                enabled && shasKey !== ''
                    ? shasKey.split(',').filter((sha) => !(sha in summaries))
                    : [],
            ),
        [enabled, shasKey, summaries],
    );
    const reload = useCallback(() => setReloads((count) => count + 1), []);

    return { summaries, pending, reload };
}
