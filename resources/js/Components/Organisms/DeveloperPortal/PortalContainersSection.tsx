import { useEffect, useState } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import BarChartCard from '@/Components/Molecules/BarChartCard/BarChartCard';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { PortalContainer, PortalContainers } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { containerUptimeSeconds, formatUptime } from '@/utils/uptime';

interface PortalContainersSectionProps {
    /** Undefined while the deferred prop is still loading. */
    containers?: PortalContainers;
}

const STATE_DOT: Record<string, string> = {
    running: 'bg-[var(--success-color)]',
    restarting: 'bg-[var(--warning-color)]',
    paused: 'bg-[var(--warning-color)]',
};

/** Re-renders every second so uptime counts up without asking the server. */
function useNow(intervalMs = 1000): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}

const hours = (seconds: number) =>
    seconds >= 86400
        ? `${(seconds / 86400).toFixed(1)}d`
        : `${(seconds / 3600).toFixed(1)}h`;

function ContainerRow({
    container,
    now,
}: {
    container: PortalContainer;
    now: number;
}) {
    const running = container.state === 'running';

    return (
        <SettingsPanelRow
            title={container.service}
            description={`${container.name} · ${container.image}`}
            action={
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {container.health && (
                        <Badge
                            variant="outline"
                            className={cn(
                                container.health === 'healthy'
                                    ? 'text-[var(--success-color)]'
                                    : 'text-[var(--error-color)]',
                            )}
                        >
                            {container.health}
                        </Badge>
                    )}
                    {container.restartCount > 0 && (
                        <Badge variant="outline">
                            {container.restartCount} restarts
                        </Badge>
                    )}
                    <span className="flex items-center gap-1.5 text-sm tabular-nums text-[var(--text-color)]">
                        <span
                            aria-hidden="true"
                            className={cn(
                                'h-2 w-2 rounded-full',
                                STATE_DOT[container.state] ??
                                    'bg-[var(--error-color)]',
                            )}
                        />
                        {running
                            ? formatUptime(
                                  containerUptimeSeconds(container, now),
                              )
                            : container.state}
                    </span>
                </div>
            }
        />
    );
}

export default function PortalContainersSection({
    containers,
}: PortalContainersSectionProps) {
    const now = useNow();

    if (!containers) {
        return (
            <SettingsPanel
                title="Containers"
                icon="Container"
                description="Uptime of this project's Docker containers."
            >
                <p
                    role="status"
                    className="animate-pulse px-5 py-6 text-sm text-[var(--text-gray-color)]"
                >
                    Reading Docker…
                </p>
            </SettingsPanel>
        );
    }

    if (!containers.available) {
        return (
            <SettingsPanel
                title="Containers"
                icon="Container"
                description="Uptime of this project's Docker containers."
            >
                <p
                    role="alert"
                    className="flex items-start gap-2 px-5 py-4 text-sm text-[var(--warning-color)]"
                >
                    <Icon
                        name="TriangleAlert"
                        size={16}
                        className="mt-0.5 shrink-0"
                    />
                    {containers.error ?? 'Docker is not available.'}
                </p>
            </SettingsPanel>
        );
    }

    const running = containers.containers.filter(
        (container) => container.state === 'running',
    );

    return (
        <div className="space-y-5">
            <BarChartCard
                title="Container uptime"
                icon="ChartColumn"
                formatValue={hours}
                emptyText="No running containers."
                items={running.map((container) => {
                    const seconds = containerUptimeSeconds(container, now);

                    return {
                        key: container.id,
                        label: container.service,
                        value: seconds,
                        valueLabel: formatUptime(seconds),
                    };
                })}
                summary={
                    <>
                        <span>
                            Running:{' '}
                            <strong className="text-[var(--text-color)]">
                                {running.length}/{containers.containers.length}
                            </strong>
                        </span>
                        {containers.containers.length > running.length && (
                            <span className="flex items-center gap-1 text-[var(--error-color)]">
                                <Icon name="CircleAlert" size={12} />
                                {containers.containers.length -
                                    running.length}{' '}
                                not running
                            </span>
                        )}
                    </>
                }
            />

            <SettingsPanel
                title="Containers"
                icon="Container"
                description="Uptime of this project's Docker containers."
            >
                {containers.containers.map((container) => (
                    <ContainerRow
                        key={container.id}
                        container={container}
                        now={now}
                    />
                ))}
            </SettingsPanel>
        </div>
    );
}
