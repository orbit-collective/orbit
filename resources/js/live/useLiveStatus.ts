import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LiveStatus } from '@/types/Live';
import { onLiveStatus } from './echo';
import { useLiveConnection } from './useLiveConnection';

/**
 * Where the live connection stands: `off` without Reverb, otherwise
 * `connecting`, `live` or `offline` (the socket is down and being retried).
 */
export function useLiveStatus(): LiveStatus {
    // Enabled but without a connection yet means the socket libraries are
    // still downloading: that is `connecting`, not `off`.
    const enabled = Boolean(usePage().props.live?.enabled);
    const connection = useLiveConnection();
    const idle: LiveStatus = enabled ? 'connecting' : 'off';
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
