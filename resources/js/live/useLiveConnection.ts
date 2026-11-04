import { usePage } from '@inertiajs/react';
import { LiveConnection } from '@/types/Live';

/**
 * The Reverb connection the server handed to this page, or null when live
 * updates are off (no Reverb, or a guest). Hooks that need the socket call
 * this first and do nothing without it.
 */
export function useLiveConnection(): LiveConnection | null {
    const { live } = usePage().props;

    return live?.enabled ? live : null;
}
