import { router } from '@inertiajs/react';
import { useRef } from 'react';
import { ProjectChangedPayload } from '@/types/Live';
import {
    deletesIssue,
    issuePageFallbackReloads,
    issuePageReloads,
} from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';
import { useLiveFallback } from './useLiveFallback';

interface IssueLiveOptions {
    projectId: number;
    issueId: number;
    /** Ids of the parent chain and children shown on the page. */
    related: number[];
    /** The activity feed is on screen, so it must be refreshed too. */
    activityVisible: boolean;
}

/**
 * Keep an issue page in step with other people's changes (status, assignee,
 * comments, description, ...). When the issue itself is deleted the page has
 * nothing left to show, so it goes back to the project.
 */
export function useIssueLive({
    projectId,
    issueId,
    related,
    activityVisible,
}: IssueLiveOptions): void {
    const latest = useRef({ related, activityVisible });
    latest.current = { related, activityVisible };

    // No socket: re-read the issue on a timer instead.
    useLiveFallback(() =>
        issuePageFallbackReloads(latest.current.activityVisible),
    );

    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        `project.${projectId}`,
        {
            'project.changed': ({ changes }) => {
                if (deletesIssue(changes, issueId)) {
                    router.visit(route('projects.show', projectId));
                    return;
                }

                issuePageReloads(
                    changes,
                    issueId,
                    latest.current.related,
                    latest.current.activityVisible,
                ).forEach((reload) => requestLiveReload(reload));
            },
        },
    );
}
