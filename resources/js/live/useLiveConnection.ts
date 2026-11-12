import { usePage } from '@inertiajs/react';
import { LiveConnection } from '@/types/Live';
import { useEchoReady } from './echoLoader';

/**
 * The Reverb connection the server handed to this page, or null when live
 * updates are off (no Reverb, or a guest). Hooks that need the socket call
 * this first and do nothing without it. It is also null for the moment it
 * takes the socket libraries to download (see `echoLoader.ts`).
 */
export function useLiveConnection(): LiveConnection | null {
    const { live } = usePage().props;
    const ready = useEchoReady(Boolean(live?.enabled));

    return live?.enabled && ready ? live : null;
}
