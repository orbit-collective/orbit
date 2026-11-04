import { ProjectChangedPayload } from '@/types/Live';
import { dashboardReloads } from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';

/** Most project channels one dashboard listens to, a guard for very large workspaces. */
export const DASHBOARD_MAX_CHANNELS = 25;

/** Refresh the dashboard's counters, trend and feed when a project of the user changes. */
export function useDashboardLive(projectIds: number[]): void {
    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        projectIds
            .slice(0, DASHBOARD_MAX_CHANNELS)
            .map((id) => `project.${id}`),
        {
            'project.changed': ({ changes }) =>
                dashboardReloads(changes).forEach((reload) =>
                    requestLiveReload(reload),
                ),
        },
    );
}
