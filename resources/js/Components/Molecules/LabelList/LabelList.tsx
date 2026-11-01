import React, { useLayoutEffect, useRef, useState } from 'react';
import LabelBadge from '@/Components/Atoms/LabelBadge/LabelBadge';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { IssueLabel } from '@/types/Issues';
import { cn } from '@/utils/cn';

interface LabelListProps {
    labels: IssueLabel[];
    badgeClassName?: string;
    isClosed?: boolean;
    /** Extra classes for the row, e.g. `flex-wrap` for a fixed count in narrow text. */
    className?: string;
    /** A fixed count, or `'auto'` to show as many badges as the container's width allows. */
    maxDisplay?: number | 'auto';
}

const GAP = 6; // gap-1.5
const AUTO_FALLBACK = 2; // used until a width has been measured

/**
 * `plusWidths[r - 1]` is the width of the "+r" badge, so each candidate count
 * is checked against the badge it would really show (`total - n` left over).
 */
const fitCount = (
    widths: number[],
    plusWidths: number[],
    available: number,
) => {
    const total = widths.length;
    for (let n = total; n > 0; n--) {
        const badges = widths.slice(0, n).reduce((a, w) => a + w, 0);
        const gaps = (n - 1) * GAP;
        const more = n < total ? GAP + (plusWidths[total - n - 1] ?? 0) : 0;
        if (badges + gaps + more <= available) return n;
    }
    // Not even one badge fits next to "+N": a lone label is kept (and
    // truncated), several collapse entirely into the "+N" badge.
    return total === 1 ? 1 : 0;
};

const LabelList: React.FC<LabelListProps> = ({
    labels,
    badgeClassName,
    isClosed = false,
    className,
    maxDisplay = 2,
}) => {
    const isAuto = maxDisplay === 'auto';
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);
    const [autoCount, setAutoCount] = useState(AUTO_FALLBACK);
    const labelsKey = (labels ?? []).join('\u0000');
    const labelsCount = labels?.length ?? 0;

    useLayoutEffect(() => {
        const container = containerRef.current;
        const measure = measureRef.current;
        if (!isAuto || !container || !measure) return;

        const update = () => {
            const available = container.clientWidth;
            if (available <= 0) return;
            const nodes = Array.from(
                measure.firstElementChild?.children ?? [],
            ) as HTMLElement[];
            const plusWidths = nodes
                .splice(labelsCount)
                .map((n) => n.offsetWidth);
            const widths = nodes.map((n) => n.offsetWidth);
            setAutoCount(fitCount(widths, plusWidths, available));
        };

        update();
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(update);
        observer.observe(container);
        // The container's width is fixed by its column, so a web font
        // finishing loading only shows up as a size change of the badges.
        if (measure.firstElementChild) {
            observer.observe(measure.firstElementChild);
        }
        return () => observer.disconnect();
    }, [isAuto, labelsKey]);

    if (!labels || labels.length === 0) return null;

    const limit = isAuto ? autoCount : maxDisplay;
    const displayedLabels = labels.slice(0, limit);
    const remainingLabels = labels.slice(limit);

    return (
        <div
            ref={containerRef}
            className={cn(
                'relative flex items-center gap-1.5',
                isAuto && 'w-full min-w-0',
                className,
            )}
        >
            {isAuto && (
                <div
                    ref={measureRef}
                    aria-hidden="true"
                    className="pointer-events-none invisible absolute left-0 top-0 h-0 w-0 overflow-hidden"
                >
                    <div className="flex w-max gap-1.5 whitespace-nowrap">
                        {labels.map((label, idx) => (
                            <LabelBadge
                                key={idx}
                                label={label}
                                className={cn('shrink-0', badgeClassName)}
                            />
                        ))}
                        {labels.map((_, idx) => (
                            <span
                                key={idx}
                                className={cn(
                                    'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium',
                                    badgeClassName,
                                )}
                            >
                                +{idx + 1}
                            </span>
                        ))}
                    </div>
                </div>
            )}
            {displayedLabels.map((label, idx) => (
                <LabelBadge
                    key={idx}
                    label={label}
                    className={cn(
                        isAuto &&
                            (labels.length === 1
                                ? 'min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap'
                                : 'shrink-0 whitespace-nowrap'),
                        badgeClassName,
                        isClosed && 'opacity-40',
                    )}
                />
            ))}
            {remainingLabels.length > 0 && (
                <Dropdown
                    variant="panel"
                    ariaLabel="More labels"
                    align="end"
                    width={224}
                    trigger={
                        <button
                            type="button"
                            className={cn(
                                'inline-flex cursor-pointer items-center rounded-full border-none bg-[var(--bg-light-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-light-color-hover)]',
                                badgeClassName,
                                isClosed && 'opacity-40',
                            )}
                        >
                            +{remainingLabels.length}
                        </button>
                    }
                >
                    <div className="flex min-h-0 flex-col gap-2 p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]">
                                More Labels
                            </p>
                            <span className="text-[10px] text-[var(--text-muted-color)]">
                                {remainingLabels.length}
                            </span>
                        </div>
                        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                            {remainingLabels.map((label, idx) => (
                                <LabelBadge
                                    key={idx}
                                    label={label}
                                    className={badgeClassName}
                                />
                            ))}
                        </div>
                    </div>
                </Dropdown>
            )}
        </div>
    );
};

export default LabelList;
