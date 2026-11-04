import { useEffect, useRef } from 'react';
import { IssuePageLooks } from '@/types/Issues';
import { ProjectChange, ProjectChangedPayload } from '@/types/Live';
import { projectPageReloads } from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';

/** The list and the board show the same `issues` prop, so they share one data group. */
type DataGroup = 'issues' | 'Calendar' | 'Activity';

const groupOf = (view: IssuePageLooks): DataGroup =>
    view === 'Calendar' || view === 'Activity' ? view : 'issues';

const GROUPS: DataGroup[] = ['issues', 'Calendar', 'Activity'];

/** Distinct changes remembered per group; more than this collapse to one per type. */
const MAX_MISSED = 50;

/**
 * Add `incoming` to what a group missed. Entries are de-duplicated, so a burst
 * of changes to one issue is one entry, and past the limit they collapse to one
 * `bulk` entry per type: the types stay known (a label rename must not be
 * pushed out by fifty issue edits), only the ids are given up.
 */
export function mergeMissed(
    missed: ProjectChange[],
    incoming: ProjectChange[],
): ProjectChange[] {
    const distinct = new Map<string, ProjectChange>();

    for (const change of [...missed, ...incoming]) {
        distinct.set(`${change.type}:${change.id}:${change.action}`, change);
    }

    if (distinct.size <= MAX_MISSED) return [...distinct.values()];

    return [
        ...new Set([...distinct.values()].map((change) => change.type)),
    ].map((type) => ({ type, id: null, action: 'bulk' }));
}

/**
 * Keep the project page (list, board, calendar, activity) in step with other
 * people's changes: an event re-reads only the props the visible view shows.
 * `calendarRange` is the span the calendar currently displays.
 *
 * A view that is not open is not re-read, so what it missed is remembered and
 * re-read the moment it is opened (an issue created while Activity was open
 * must be in the list when the user switches to it).
 */
export function useProjectLive(
    projectId: number,
    view: IssuePageLooks,
    calendarRange: React.MutableRefObject<[string, string] | null>,
): void {
    const latest = useRef(view);
    latest.current = view;
    const missed = useRef<Record<DataGroup, ProjectChange[]>>({
        issues: [],
        Calendar: [],
        Activity: [],
    });

    useEffect(() => {
        const group = groupOf(view);
        const pending = missed.current[group];
        if (pending.length === 0) return;

        missed.current[group] = [];
        projectPageReloads(pending, view, calendarRange.current).forEach(
            (reload) => requestLiveReload(reload),
        );
    }, [view, calendarRange]);

    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        `project.${projectId}`,
        {
            'project.changed': ({ changes }) => {
                const open = groupOf(latest.current);
                for (const group of GROUPS) {
                    missed.current[group] =
                        group === open
                            ? []
                            : mergeMissed(missed.current[group], changes);
                }

                projectPageReloads(
                    changes,
                    latest.current,
                    calendarRange.current,
                ).forEach((reload) => requestLiveReload(reload));
            },
        },
    );
}
