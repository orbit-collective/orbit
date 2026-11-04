import { ProjectChangedPayload } from '@/types/Live';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';

/** What a project's settings pages list: people, roles, labels, priorities, issue types. */
const SETTINGS_TYPES = new Set([
    'members',
    'roles',
    'labels',
    'priorities',
    'issue-types',
    'project',
]);

/**
 * Keep a project settings page (members, roles, labels, ...) in step with
 * other admins' changes. `projectId` is the project the page currently shows,
 * null when none is selected.
 */
export function useSettingsLive(projectId: number | null): void {
    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        projectId ? `project.${projectId}` : null,
        {
            'project.changed': ({ changes }) => {
                if (changes.some((change) => SETTINGS_TYPES.has(change.type))) {
                    requestLiveReload({});
                }
            },
        },
    );
}
