import { PortalContainer } from '@/types/DeveloperPortal';

/** "3d 4h", "2h 15m", "45m", "30s": the two largest non-zero units. */
export function formatUptime(totalSeconds: number): string {
    const seconds = Math.max(0, Math.floor(totalSeconds));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    if (minutes > 0) return `${minutes}m`;

    return `${seconds}s`;
}

/**
 * How long a container has been up at `now` (ms). Computed from its start time
 * so the page can tick every second without asking the server again; a
 * container that is not running has no uptime.
 */
export function containerUptimeSeconds(
    container: Pick<PortalContainer, 'state' | 'startedAt' | 'uptimeSeconds'>,
    now: number,
): number {
    if (container.state !== 'running') return 0;
    if (!container.startedAt) return container.uptimeSeconds;

    const started = Date.parse(container.startedAt);

    return Number.isNaN(started)
        ? container.uptimeSeconds
        : Math.max(0, (now - started) / 1000);
}
