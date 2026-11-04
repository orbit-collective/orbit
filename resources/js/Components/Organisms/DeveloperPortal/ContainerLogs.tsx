import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import ToggleChip from '@/Components/Molecules/ToggleChip/ToggleChip';
import { useAlert } from '@/context/AlertContext';
import { useContainerLogs } from '@/hooks/useContainerLogs';
import { PortalLogLine } from '@/types/DeveloperPortal';
import { cn } from '@/utils/cn';

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
                <div className="min-w-[10rem] flex-1">
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
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
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
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-gray-color)] hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                >
                    <Icon name="Copy" size={14} />
                </button>
            </div>

            <div
                ref={scroller}
                role="log"
                aria-label="Container logs"
                className="max-h-80 overflow-auto rounded-lg bg-[var(--bg-dark-color)] p-3 font-mono text-[11px] leading-relaxed"
            >
                {!loaded ? (
                    <p className="animate-pulse text-[var(--text-gray-color)]">
                        Loading logs…
                    </p>
                ) : error ? (
                    <p className="text-[var(--error-color)]">{error}</p>
                ) : visible.length === 0 ? (
                    <p className="text-[var(--text-gray-color)]">
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
                                    'text-[var(--error-color)]':
                                        lineTone(line) === 'error',
                                    'text-[var(--warning-color)]':
                                        lineTone(line) === 'warning',
                                    'text-[var(--text-gray-color)]':
                                        lineTone(line) === 'normal',
                                },
                            )}
                        >
                            {line.time && (
                                <span className="shrink-0 text-[var(--text-muted-color)]">
                                    {clock(line.time)}
                                </span>
                            )}
                            <span className="min-w-0">{line.text}</span>
                        </div>
                    ))
                )}
            </div>

            <p className="text-[11px] text-[var(--text-muted-color)]">
                {visible.length} of {lines.length} lines
                {follow && ' · following'}
            </p>
        </div>
    );
}
