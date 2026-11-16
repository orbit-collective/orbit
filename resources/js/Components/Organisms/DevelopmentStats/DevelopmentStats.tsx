import { useLaravelReactI18n } from 'laravel-react-i18n';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import {
    DevelopmentInsights,
    DevelopmentPullRequest,
} from '@/types/Development';
import { ciPassRate, recentCommitCount } from '@/utils/development';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const COMMIT_WEEKS = 4;

interface DevelopmentStatsProps {
    /** `null` while the list is on its way. */
    pullRequests: DevelopmentPullRequest[] | null;
    insights: DevelopmentInsights | null;
    /** The checks of open pull requests are still arriving: the pass rate waits for them. */
    ciPending?: boolean;
}

/**
 * The row of numbers at the top of the Development view, drawn with the same
 * stat cards as the dashboard. A card whose data is not there yet shows a dash
 * instead of a number that would be wrong.
 */
export default function DevelopmentStats({
    pullRequests,
    insights,
    ciPending = false,
}: DevelopmentStatsProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const dash = '—';
    // A figure whose data is on its way is a skeleton, never a stale or made-up number.
    const pending = (index: number) => (
        <Skeleton
            index={index}
            className="inline-block h-5 w-10 align-middle"
        />
    );

    const open = pullRequests?.filter((pr) => pr.state === 'open') ?? [];
    const weekAgo = Date.now() - WEEK_MS;
    const mergedThisWeek =
        pullRequests?.filter(
            (pr) => pr.mergedAt !== null && Date.parse(pr.mergedAt) >= weekAgo,
        ).length ?? 0;
    const needReview = open.filter(
        (pr) => !pr.draft && pr.requestedReviewers.length > 0,
    ).length;
    const passRate = pullRequests ? ciPassRate(pullRequests) : null;
    const commits = insights
        ? recentCommitCount(insights.commitActivity, COMMIT_WEEKS)
        : null;

    const cards = [
        {
            key: 'open',
            title: t('development_stats.open'),
            value: pullRequests ? String(open.length) : pending(0),
            icon: 'GitPullRequest' as const,
            color: 'success' as const,
            description: tChoice('development_stats.open_hint', needReview, {
                count: needReview,
            }),
        },
        {
            key: 'merged',
            title: t('development_stats.merged'),
            value: pullRequests ? String(mergedThisWeek) : pending(1),
            icon: 'GitMerge' as const,
            color: 'accent' as const,
            description: t('development_stats.merged_hint'),
        },
        {
            key: 'checks',
            title: t('development_stats.checks'),
            value: !pullRequests
                ? pending(2)
                : passRate === null
                  ? ciPending
                      ? pending(2)
                      : dash
                  : `${passRate}%`,
            icon: 'CircleCheck' as const,
            color:
                passRate === null || passRate >= 80
                    ? ('success' as const)
                    : passRate >= 50
                      ? ('warning' as const)
                      : ('error' as const),
            description: t('development_stats.checks_hint'),
            progress: passRate ?? undefined,
        },
        {
            key: 'commits',
            title: t('development_stats.commits'),
            value: commits === null ? pending(3) : String(commits),
            icon: 'GitCommitHorizontal' as const,
            color: 'info' as const,
            description: t('development_stats.commits_hint', {
                weeks: COMMIT_WEEKS,
            }),
        },
        {
            key: 'contributors',
            title: t('development_stats.contributors'),
            value: insights ? String(insights.contributors.length) : pending(4),
            icon: 'Users' as const,
            color: 'warning' as const,
            description: t('development_stats.contributors_hint'),
        },
    ];

    return (
        <ul
            aria-busy={!pullRequests || !insights}
            className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 xl:grid-cols-5"
        >
            {cards.map(({ key, ...card }, index) => (
                <li key={key} className="min-w-0">
                    <RowReveal index={index} fill>
                        <StatCard variant="vivid" {...card} />
                    </RowReveal>
                </li>
            ))}
        </ul>
    );
}
