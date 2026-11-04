import { useEffect, useState } from 'react';
import { LiveStatus } from '@/types/Live';
import { onLiveStatus } from './echo';
import { useLiveConnection } from './useLiveConnection';

/**
 * Where the live connection stands: `off` without Reverb, otherwise
 * `connecting`, `live` or `offline` (the socket is down and being retried).
 */
export function useLiveStatus(): LiveStatus {
    const connection = useLiveConnection();
    const [status, setStatus] = useState<LiveStatus>(
        connection ? 'connecting' : 'off',
    );

    useEffect(() => {
        if (!connection) {
            setStatus('off');
            return;
        }

        return onLiveStatus(connection, setStatus);
    }, [connection?.key, connection?.host, connection?.port]);

    return connection ? status : 'off';
}
