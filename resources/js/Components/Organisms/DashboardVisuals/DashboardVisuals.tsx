import React from 'react';
import { DashboardVisualsProps } from '@/types/Components';
import { CompletionRatioCard } from '../../Molecules/CompletionRatioCard/CompletionRatioCard';
import { PriorityBreakdownCard } from '../../Molecules/PriorityBreakdownCard/PriorityBreakdownCard';
import { ProductivityTrendCard } from '../../Molecules/ProductivityTrendCard/ProductivityTrendCard';

const percent = (part: number, total: number) =>
    total === 0 ? 0 : Math.round((part / total) * 100);

const DashboardVisuals: React.FC<DashboardVisualsProps> = ({
    stats: { total, priority, noPriority, category },
    productivity_trend,
}) => {
    const stats = {
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
                    priorities={priority}
                    noPriority={noPriority}
                    total={total}
                />
            </div>
        </div>
    );
};

export default DashboardVisuals;
