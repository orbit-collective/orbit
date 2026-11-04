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

/** Changes remembered per group; more than this are as good as "everything". */
const MAX_MISSED = 50;

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
                            : [...missed.current[group], ...changes].slice(
                                  -MAX_MISSED,
                              );
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
