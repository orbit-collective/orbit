import { DashboardVisualsProps } from '@/types/Components';
import React, { useMemo } from 'react';
import { CompletionRatioCard } from '../../Molecules/CompletionRatioCard/CompletionRatioCard';
import { PriorityBreakdownCard } from '../../Molecules/PriorityBreakdownCard/PriorityBreakdownCard';
import { ProductivityTrendCard } from '../../Molecules/ProductivityTrendCard/ProductivityTrendCard';

const DashboardVisuals: React.FC<DashboardVisualsProps> = ({
    issues,
    productivity_trend,
}) => {
    const stats = useMemo(() => {
        const total = issues.length;
        if (total === 0) {
            return {
                high: 0,
                medium: 0,
                low: 0,
                highPct: 0,
                mediumPct: 0,
                lowPct: 0,
                open: 0,
                inProgress: 0,
                closed: 0,
                openPct: 0,
                inProgressPct: 0,
                closedPct: 0,
            };
        }

        const high = issues.filter((i) => i.priority === 'high').length;
        const medium = issues.filter((i) => i.priority === 'medium').length;
        const low = issues.filter((i) => i.priority === 'low').length;

        const open = issues.filter((i) => i.status === 'open').length;
        const inProgress = issues.filter(
            (i) => i.status === 'in_progress',
        ).length;
        const closed = issues.filter((i) => i.status === 'closed').length;

        return {
            high,
            medium,
            low,
            highPct: Math.round((high / total) * 100),
            mediumPct: Math.round((medium / total) * 100),
            lowPct: Math.round((low / total) * 100),
            open,
            inProgress,
            closed,
            openPct: Math.round((open / total) * 100),
            inProgressPct: Math.round((inProgress / total) * 100),
            closedPct: Math.round((closed / total) * 100),
        };
    }, [issues]);

    return (
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">
            <ProductivityTrendCard
                trendData={productivity_trend}
                className="lg:col-span-2"
            />

            <div className="flex flex-col gap-5">
                <CompletionRatioCard
                    open={stats.open}
                    inProgress={stats.inProgress}
                    closed={stats.closed}
                    total={issues.length}
                    closedPct={stats.closedPct}
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
