import React from 'react';
import { DashboardVisualsProps } from '@/types/Components';
import { CompletionRatioCard } from '../../Molecules/CompletionRatioCard/CompletionRatioCard';
import { PriorityBreakdownCard } from '../../Molecules/PriorityBreakdownCard/PriorityBreakdownCard';
import { ProductivityTrendCard } from '../../Molecules/ProductivityTrendCard/ProductivityTrendCard';

const percent = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

const DashboardVisuals: React.FC<DashboardVisualsProps> = ({
    stats: { total, priority, category },
    productivity_trend,
}) => {
    const stats = {
        high: priority.high,
        medium: priority.medium,
        low: priority.low,
        highPct: percent(priority.high, total),
        mediumPct: percent(priority.medium, total),
        lowPct: percent(priority.low, total),
        todo: category.todo,
        inProgress: category.in_progress,
        done: category.done,
        donePct: percent(category.done, total),
    };

    return (
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            <ProductivityTrendCard
                trendData={productivity_trend}
                className="lg:col-span-2"
            />

            <div className="flex flex-col gap-5">
                <CompletionRatioCard
                    todo={stats.todo}
                    inProgress={stats.inProgress}
                    done={stats.done}
                    total={total}
                    donePct={stats.donePct}
                />

                <PriorityBreakdownCard
                    high={stats.high}
                    medium={stats.medium}
                    low={stats.low}
                    highPct={stats.highPct}
                    mediumPct={stats.mediumPct}
                    lowPct={stats.lowPct}
                />
            </div>
        </div>
    );
};

export default DashboardVisuals;
