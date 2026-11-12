import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LiveStatus } from '@/types/Live';
import { onLiveStatus } from './echo';
import { useEchoFailed } from './echoLoader';
import { useLiveConnection } from './useLiveConnection';

/**
 * Where the live connection stands: `off` without Reverb, otherwise
 * `connecting`, `live` or `offline` (the socket is down and being retried).
 */
export function useLiveStatus(): LiveStatus {
    // Enabled but without a connection yet means the socket libraries are
    // still downloading (`connecting`), or could not be downloaded and are
    // being retried (`offline`, so the polling fallback takes over).
    const enabled = Boolean(usePage().props.live?.enabled);
    const downloadFailed = useEchoFailed();
    const connection = useLiveConnection();
    const idle: LiveStatus = !enabled
        ? 'off'
        : downloadFailed
          ? 'offline'
          : 'connecting';
    const [status, setStatus] = useState<LiveStatus>(idle);

    useEffect(() => {
        if (!connection) {
            setStatus(idle);
            return;
        }

        return onLiveStatus(connection, setStatus);
    }, [connection?.key, connection?.host, connection?.port, idle]);

    return connection ? status : idle;
}
