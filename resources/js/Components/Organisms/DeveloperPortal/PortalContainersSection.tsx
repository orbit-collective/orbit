import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import Icon from '@/Components/Atoms/Icon/Icon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import BarChartCard from '@/Components/Molecules/BarChartCard/BarChartCard';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import { CollapseProps } from '@/hooks/useCollapsedSections';
import { PortalContainer, PortalContainers } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { FOCUS_RING_INSET } from '@/utils/focusRing';
import { rowIn, rowDelay } from '@/utils/motion';
import { containerUptimeSeconds, formatUptime } from '@/utils/uptime';
import ContainerLogs from './ContainerLogs';

interface PortalContainersSectionProps {
    /** Undefined while the deferred prop is still loading. */
    containers?: PortalContainers;
    collapse?: CollapseProps;
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

function Detail({ label, value }: { label: string; value: string }) {
    return (
        <div className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-[var(--text-muted-color)]">
                {label}
            </dt>
            <dd
                className="truncate text-xs text-[var(--text-color)]"
                title={value}
            >
                {value}
            </dd>
        </div>
    );
}

function ContainerRow({
    container,
    now,
    index,
}: {
    container: PortalContainer;
    now: number;
    index: number;
}) {
    const [open, setOpen] = useState(false);
    const running = container.state === 'running';
    const panelId = `container-${container.id}`;

    return (
        <motion.div
            variants={rowIn}
            initial="hidden"
            animate="show"
            transition={{ delay: rowDelay(index) }}
            className="hover:bg-[var(--bg-light-color)]/50 transition-colors duration-200"
        >
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpen((value) => !value)}
                className={cn(
                    'flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3.5 text-left sm:px-5',
                    FOCUS_RING_INSET,
                )}
            >
                <Icon
                    name="ChevronRight"
                    size={14}
                    className={cn(
                        'shrink-0 text-[var(--text-muted-color)] transition-transform duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)]',
                        open && 'rotate-90',
                    )}
                />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[var(--text-color)]">
                        {container.service}
                    </span>
                    <span className="block truncate text-xs text-[var(--text-gray-color)]">
                        {container.name} · {container.image}
                    </span>
                </span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
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
                            className="relative flex h-2 w-2"
                        >
                            {running && (
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--success-color)] opacity-50 [animation-duration:2.4s] motion-reduce:hidden" />
                            )}
                            <span
                                className={cn(
                                    'relative inline-flex h-2 w-2 rounded-full',
                                    STATE_DOT[container.state] ??
                                        'bg-[var(--error-color)]',
                                )}
                            />
                        </span>
                        {running
                            ? formatUptime(
                                  containerUptimeSeconds(container, now),
                              )
                            : container.state}
                    </span>
                </span>
            </button>

            <Collapse open={open} id={panelId} unmountWhenClosed>
                <div className="space-y-4 border-t border-[var(--border-color)] px-4 py-4 sm:px-5">
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Detail label="Container" value={container.id} />
                        <Detail
                            label="Status"
                            value={container.status || container.state}
                        />
                        <Detail
                            label="Started"
                            value={
                                container.startedAt
                                    ? new Date(
                                          container.startedAt,
                                      ).toLocaleString()
                                    : 'not running'
                            }
                        />
                        <Detail
                            label="Restarts"
                            value={String(container.restartCount)}
                        />
                    </dl>
                    <ContainerLogs containerId={container.id} />
                </div>
            </Collapse>
        </motion.div>
    );
}

export default function PortalContainersSection({
    containers,
    collapse,
}: PortalContainersSectionProps) {
    const now = useNow();

    if (!containers) {
        return (
            <Reveal key="loading">
                <SettingsPanel
                    title="Containers"
                    icon="Container"
                    description="Uptime of this project's Docker containers."
                    {...collapse?.('containers')}
                >
                    <p
                        role="status"
                        className="animate-pulse px-5 py-6 text-sm text-[var(--text-gray-color)]"
                    >
                        Reading Docker…
                    </p>
                </SettingsPanel>
            </Reveal>
        );
    }

    if (!containers.available) {
        return (
            <Reveal key="unavailable">
                <SettingsPanel
                    title="Containers"
                    icon="Container"
                    description="Uptime of this project's Docker containers."
                    {...collapse?.('containers')}
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
            </Reveal>
        );
    }

    const running = containers.containers.filter(
        (container) => container.state === 'running',
    );

    return (
        <Reveal key="loaded" className="space-y-5">
            <BarChartCard
                {...collapse?.('uptime', `${running.length} running`)}
                title="Container uptime"
                icon="ChartColumn"
                formatValue={hours}
                emptyText="No running containers."
                items={running.map((container) => {
                    // The server's reading, not the ticking clock: the chart
                    // glides at each refresh instead of re-animating every second.
                    return {
                        key: container.id,
                        label: container.service,
                        value: container.uptimeSeconds,
                        valueLabel: formatUptime(container.uptimeSeconds),
                    };
                })}
                summary={
                    <>
                        <Badge className="border-[var(--success-color)]/20 bg-[var(--success-color)]/10 gap-1.5 px-2.5 py-1 text-xs text-[var(--success-color)]">
                            Running
                            <strong>
                                {running.length}/{containers.containers.length}
                            </strong>
                        </Badge>
                        {containers.containers.length > running.length && (
                            <Badge className="border-[var(--error-color)]/20 bg-[var(--error-color)]/10 gap-1.5 px-2.5 py-1 text-xs text-[var(--error-color)]">
                                <Icon name="CircleAlert" size={12} />
                                {containers.containers.length -
                                    running.length}{' '}
                                not running
                            </Badge>
                        )}
                    </>
                }
            />

            <SettingsPanel
                title="Containers"
                icon="Container"
                description="Click a container for its details and live logs."
                {...collapse?.(
                    'containers',
                    `${running.length}/${containers.containers.length} running`,
                )}
            >
                {containers.containers.map((container, index) => (
                    <ContainerRow
                        key={container.id}
                        container={container}
                        now={now}
                        index={index}
                    />
                ))}
            </SettingsPanel>
        </Reveal>
    );
}
