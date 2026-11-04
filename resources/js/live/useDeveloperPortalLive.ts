import { useEffect } from 'react';
import {
    DeveloperPortalChangedPayload,
    PortalChangeKind,
} from '@/types/DeveloperPortal';
import { LiveReload, requestLiveReload } from './reloadQueue';
import { useLiveChannel } from './useLiveChannel';
import { useLiveFallback } from './useLiveFallback';

/** The page props each kind of change makes stale. */
const PROPS: Record<PortalChangeKind, string[]> = {
    users: ['totals', 'portalUsers'],
    projects: ['totals', 'portalProjects'],
    issues: ['totals', 'portalProjects'],
    errors: ['errorLog'],
};

/** Seconds between container status refreshes: Docker has no event we can hear. */
export const CONTAINERS_REFRESH_SECONDS = 15;

export function portalReloads(kinds: PortalChangeKind[]): LiveReload[] {
    const only = [...new Set(kinds.flatMap((kind) => PROPS[kind] ?? []))];

    return only.length > 0 ? [{ only }] : [];
}

/** Without a socket everything is re-read on the fallback timer. */
export function portalFallbackReloads(): LiveReload[] {
    return [
        {
            only: [
                'totals',
                'portalUsers',
                'portalProjects',
                'errorLog',
                'containers',
            ],
        },
    ];
}

/**
 * Keep the Developer Portal current: totals, lists and the error log refresh
 * when the server announces a change on the `developer-portal` channel (or on
 * a timer without Reverb); container status refreshes on its own short timer.
 */
export function useDeveloperPortalLive(): void {
    useLiveFallback(portalFallbackReloads);

    useLiveChannel<{
        'developer-portal.changed': DeveloperPortalChangedPayload;
    }>('developer-portal', {
        'developer-portal.changed': ({ kinds }) =>
            portalReloads(kinds).forEach((reload) => requestLiveReload(reload)),
    });

    useEffect(() => {
        const timer = setInterval(
            () => requestLiveReload({ only: ['containers'] }),
            CONTAINERS_REFRESH_SECONDS * 1000,
        );

        return () => clearInterval(timer);
    }, []);
}
