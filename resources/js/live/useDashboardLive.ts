import { ProjectChangedPayload } from '@/types/Live';
import { dashboardFallbackReloads, dashboardReloads } from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';
import { useLiveFallback } from './useLiveFallback';

/** Most project channels one dashboard listens to, a guard for very large workspaces. */
export const DASHBOARD_MAX_CHANNELS = 25;

/** Refresh the dashboard's counters, trend and feed when a project of the user changes. */
export function useDashboardLive(projectIds: number[]): void {
    // No socket: refresh the counters and feed on a timer instead.
    useLiveFallback(() => dashboardFallbackReloads());

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
