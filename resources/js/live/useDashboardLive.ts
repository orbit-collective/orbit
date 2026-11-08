import { ProjectChangedPayload } from '@/types/Live';
import { dashboardFallbackReloads, dashboardReloads } from './changeProps';
import { requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';
import { useLiveFallback } from './useLiveFallback';

/** Most project channels one dashboard listens to, a guard for very large workspaces. */
export const DASHBOARD_MAX_CHANNELS = 25;

/**
 * Refresh the dashboard's counters, trend and feed when a project of the user
 * changes. `loadedProps` are the data props the page has, so a widget that is
 * not on the dashboard costs no refresh.
 */
export function useDashboardLive(
    projectIds: number[],
    loadedProps?: string[],
): void {
    // No socket: refresh the counters and feed on a timer instead.
    useLiveFallback(() => dashboardFallbackReloads(loadedProps));

    useLiveChannel<{ 'project.changed': ProjectChangedPayload }>(
        projectIds
            .slice(0, DASHBOARD_MAX_CHANNELS)
            .map((id) => `project.${id}`),
        {
            'project.changed': ({ changes }) =>
                dashboardReloads(changes, loadedProps).forEach((reload) =>
                    requestLiveReload(reload),
                ),
        },
    );
}
