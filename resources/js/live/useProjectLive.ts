import { useRef } from 'react';
import { IssuePageLooks } from '@/types/Issues';
import { ProjectChangedPayload } from '@/types/Live';
import { projectPageReloads } from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';

/**
 * Keep the project page (list, board, calendar, activity) in step with other
 * people's changes: an event re-reads only the props the visible view shows.
 * `calendarRange` is the span the calendar currently displays.
 */
export function useProjectLive(
    projectId: number,
    view: IssuePageLooks,
    calendarRange: React.MutableRefObject<[string, string] | null>,
): void {
    const latest = useRef(view);
    latest.current = view;

    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        `project.${projectId}`,
        {
            'project.changed': ({ changes }) => {
                projectPageReloads(
                    changes,
                    latest.current,
                    calendarRange.current,
                ).forEach((reload) => requestLiveReload(reload));
            },
        },
    );
}
