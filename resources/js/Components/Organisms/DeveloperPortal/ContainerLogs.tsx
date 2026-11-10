import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import ToggleChip from '@/Components/Molecules/ToggleChip/ToggleChip';
import { useAlert } from '@/context/AlertContext';
import { useContainerLogs } from '@/hooks/useContainerLogs';
import { PortalLogLine } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';
import { FOCUS_RING, FOCUS_RING_INSET } from '@/utils/focusRing';

interface ContainerLogsProps {
    containerId: string;
}

const PROBLEM = /\b(error|exception|fatal|critical|panic|failed)\b/i;
const WARNING = /\b(warn(ing)?|deprecated)\b/i;

export function lineTone(line: PortalLogLine): 'error' | 'warning' | 'normal' {
    if (line.stream === 'stderr' || PROBLEM.test(line.text)) return 'error';
    if (WARNING.test(line.text)) return 'warning';

    return 'normal';
}

const clock = (time: string | null) =>
    time ? new Date(time).toLocaleTimeString([], { hour12: false }) : '';

export default function ContainerLogs({ containerId }: ContainerLogsProps) {
    const { addAlert } = useAlert();
    const [follow, setFollow] = useState(true);
    const [problemsOnly, setProblemsOnly] = useState(false);
    const [filter, setFilter] = useState('');
    const { lines, error, loading, loaded, refresh } = useContainerLogs(
        containerId,
        { enabled: true, follow },
    );
    const scroller = useRef<HTMLDivElement>(null);

    const visible = useMemo(() => {
        const needle = filter.trim().toLowerCase();

        return lines.filter(
            (line) =>
                (!problemsOnly || lineTone(line) !== 'normal') &&
                (!needle || line.text.toLowerCase().includes(needle)),
        );
    }, [lines, filter, problemsOnly]);

    // Keep the newest line in view while following.
    useEffect(() => {
        const el = scroller.current;
        if (follow && el) el.scrollTop = el.scrollHeight;
    }, [visible, follow]);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(
                visible.map((line) => line.text).join('\n'),
            );
            addAlert('Logs copied', 'success');
        } catch {
            addAlert('Could not copy the logs', 'error');
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-40 flex-1">
                    <Input
                        type="search"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        placeholder="Filter lines"
                    />
                </div>
                <ToggleChip
                    label="Errors only"
                    pressed={problemsOnly}
                    onClick={() => setProblemsOnly((value) => !value)}
                />
                <ToggleChip
                    label="Follow"
                    pressed={follow}
                    onClick={() => setFollow((value) => !value)}
                />
                <button
                    type="button"
                    aria-label="Refresh logs"
                    onClick={() => void refresh()}
                    className={cn(
                        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-(--text-gray-color) transition-colors duration-200 hover:bg-(--bg-light-color) hover:text-(--text-color)',
                        FOCUS_RING,
                    )}
                >
                    <Icon
                        name="RefreshCw"
                        size={14}
                        className={cn(loading && 'animate-spin')}
                    />
                </button>
                <button
                    type="button"
                    aria-label="Copy logs"
                    onClick={() => void copy()}
                    className={cn(
                        'flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-(--text-gray-color) transition-colors duration-200 hover:bg-(--bg-light-color) hover:text-(--text-color)',
                        FOCUS_RING,
                    )}
                >
                    <Icon name="Copy" size={14} />
                </button>
            </div>

            <div
                ref={scroller}
                role="log"
                aria-label="Container logs"
                tabIndex={0}
                className={cn(
                    'max-h-80 overflow-auto rounded-lg bg-(--bg-dark-color) p-3 font-mono text-[11px] leading-relaxed',
                    FOCUS_RING_INSET,
                )}
            >
                {!loaded ? (
                    <p className="animate-pulse text-(--text-gray-color)">
                        Loading logs…
                    </p>
                ) : error ? (
                    <p className="text-(--error-color)">{error}</p>
                ) : visible.length === 0 ? (
                    <p className="text-(--text-gray-color)">
                        {lines.length === 0
                            ? 'No output yet.'
                            : 'No lines match.'}
                    </p>
                ) : (
                    visible.map((line, index) => (
                        <div
                            key={`${line.time}-${index}`}
                            data-tone={lineTone(line)}
                            className={cn(
                                'flex gap-2 whitespace-pre-wrap break-all',
                                {
                                    'text-(--error-color)':
                                        lineTone(line) === 'error',
                                    'text-(--warning-color)':
                                        lineTone(line) === 'warning',
                                    'text-(--text-gray-color)':
                                        lineTone(line) === 'normal',
                                },
                            )}
                        >
                            {line.time && (
                                <span className="shrink-0 text-(--text-muted-color)">
                                    {clock(line.time)}
                                </span>
                            )}
                            <span className="min-w-0">{line.text}</span>
                        </div>
                    ))
                )}
            </div>

            <p className="text-[11px] text-(--text-muted-color)">
                {visible.length} of {lines.length} lines
                {follow && ' · following'}
            </p>
        </div>
    );
}
