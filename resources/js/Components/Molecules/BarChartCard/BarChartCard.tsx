import React, { useId } from 'react';
import BarPlot from '@/Components/Molecules/BarPlot/BarPlot';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { BarChartCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const TICKS = 4;

/** Rounds the axis maximum up to a "nice" number so ticks read cleanly. */
export function niceMax(max: number): number {
    if (max <= 0) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(max));
    const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= max) ?? 10;

    return step * magnitude;
}

const BarChartCard: React.FC<BarChartCardProps> = ({
    title,
    icon,
    items,
    formatValue = (value) => String(Math.round(value)),
    summary,
    emptyText = 'Nothing to chart yet.',
    collapsed = false,
    onToggleCollapse,
    collapsedSummary,
    className,
}) => {
    const bodyId = useId();
    const max = niceMax(Math.max(0, ...items.map((item) => item.value)));
    const average =
        items.length > 0
            ? items.reduce((sum, item) => sum + item.value, 0) / items.length
            : 0;
    const highlighted = items.reduce<number>(
        (best, item, index) =>
            item.value > (items[best]?.value ?? -1) ? index : best,
        -1,
    );
    const ticks = Array.from({ length: TICKS + 1 }, (_, i) => ({
        percent: (100 / TICKS) * i,
        label: formatValue((max / TICKS) * i),
    }));

    return (
        <section
            className={cn(
                'rounded-2xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4 sm:p-5',
                className,
            )}
        >
            <CardHeader
                icon={icon}
                title={title}
                collapsed={collapsed}
                onToggleCollapse={onToggleCollapse}
                collapsedSummary={collapsedSummary}
                controls={bodyId}
            />

            <Collapse id={bodyId} open={!collapsed}>
                {summary && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-gray-color)]">
                        {summary}
                    </div>
                )}

                {items.length === 0 ? (
                    <p className="py-10 text-center text-sm text-[var(--text-gray-color)]">
                        {emptyText}
                    </p>
                ) : (
                    <BarPlot
                        className="mt-6"
                        ariaLabel={`${title}: ${items
                            .map(
                                (item) =>
                                    `${item.label} ${item.valueLabel ?? formatValue(item.value)}`,
                            )
                            .join(', ')}`}
                        ticks={ticks}
                        highlightKey={items[highlighted]?.key}
                        marker={{
                            percent: (average / max) * 100,
                            label: `Avg ${formatValue(average)}`,
                        }}
                        bars={items.map((item) => ({
                            key: item.key,
                            label: item.label,
                            heightPercent: (item.value / max) * 100,
                            tooltip: item.valueLabel ?? formatValue(item.value),
                        }))}
                    />
                )}
            </Collapse>
        </section>
    );
};

export default BarChartCard;
