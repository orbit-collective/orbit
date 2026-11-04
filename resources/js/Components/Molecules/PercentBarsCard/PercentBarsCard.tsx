import React, { useId } from 'react';
import Badge from '@/Components/Atoms/Badge/Badge';
import TrendBadge from '@/Components/Atoms/TrendBadge/TrendBadge';
import BarPlot from '@/Components/Molecules/BarPlot/BarPlot';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import { PercentBarsCardProps } from '@/types/Components';
import { cn } from '@/utils/cn';

const TICKS = [0, 25, 50, 75, 100].map((percent) => ({
    percent,
    label: `${percent}%`,
}));

const clamp = (value: number) => Math.min(100, Math.max(0, value));

const PercentBarsCard: React.FC<PercentBarsCardProps> = ({
    title,
    icon,
    total,
    totalLabel,
    trend,
    summary,
    bars,
    highlightKey,
    footnote,
    collapsed = false,
    onToggleCollapse,
    collapsedSummary,
    className,
}) => {
    const bodyId = useId();
    const largest = bars.reduce<(typeof bars)[number] | undefined>(
        (best, bar) => (bar.percent > (best?.percent ?? -1) ? bar : best),
        undefined,
    );
    const highlighted = bars.find((bar) => bar.key === highlightKey) ?? largest;

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
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--text-gray-color)]">
                    <Badge className="gap-1.5 px-2.5 py-1 text-xs">
                        {totalLabel}
                        <strong
                            data-testid="total"
                            className="text-sm font-semibold text-[var(--text-color)]"
                        >
                            {total}
                        </strong>
                    </Badge>
                    {trend && <TrendBadge {...trend} />}
                    {summary}
                </div>

                <BarPlot
                    className="mt-8"
                    ariaLabel={`${title}: ${bars
                        .map((bar) => `${bar.label} ${bar.percent}%`)
                        .join(', ')}`}
                    barTestId="percent-bar"
                    ticks={TICKS}
                    highlightKey={highlighted?.key}
                    marker={
                        highlighted && highlighted.percent > 0
                            ? {
                                  percent: clamp(highlighted.percent),
                                  label: `${highlighted.percent}%`,
                              }
                            : undefined
                    }
                    bars={bars.map((bar) => ({
                        key: bar.key,
                        label: bar.label,
                        heightPercent: bar.percent,
                        caption: `${bar.percent}%`,
                        tooltip: bar.tooltip ?? `${bar.label}: ${bar.percent}%`,
                    }))}
                />

                {footnote && (
                    <p className="mt-5 text-center text-xs text-[var(--accent-color)]">
                        {footnote}
                    </p>
                )}
            </Collapse>
        </section>
    );
};

export default PercentBarsCard;
