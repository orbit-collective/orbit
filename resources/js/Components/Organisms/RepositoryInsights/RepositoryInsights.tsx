import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useMemo } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import BarChartCard from '@/Components/Molecules/BarChartCard/BarChartCard';
import CardHeader from '@/Components/Molecules/CardHeader/CardHeader';
import LanguageBar from '@/Components/Molecules/LanguageBar/LanguageBar';
import { DevelopmentInsights } from '@/types/Development';
import { languageShares, recentCommitCount } from '@/utils/development';
import { intlLocale } from '@/utils/time';

/** Weeks of commit activity drawn: a quarter reads at a glance, a year is a smear. */
const ACTIVITY_WEEKS = 12;

/**
 * The repository's own statistics: commit activity per week, who commits the
 * most and what it is written in. GitHub computes these lazily, so each part
 * can be empty on the first visit; it says so instead of drawing nothing.
 */
export default function RepositoryInsights({
    insights,
}: {
    /** `null` until the first answer. */
    insights: DevelopmentInsights | null;
}) {
    const { t, currentLocale } = useLaravelReactI18n();
    const locale = intlLocale(currentLocale());

    const weeks = useMemo(
        () => insights?.commitActivity.slice(-ACTIVITY_WEEKS) ?? [],
        [insights],
    );
    const shares = useMemo(
        () =>
            insights
                ? languageShares(
                      insights.languages,
                      5,
                      t('repository_insights.other'),
                  )
                : [],
        [insights, t],
    );
    const top = insights?.contributors.slice(0, 5) ?? [];
    const most = Math.max(1, ...top.map((person) => person.contributions));

    if (!insights) {
        return (
            <div
                role="status"
                aria-label={t('repository_insights.loading')}
                className="space-y-3"
            >
                <Skeleton className="h-56 w-full rounded-2xl" />
                <Skeleton index={1} className="h-40 w-full rounded-2xl" />
            </div>
        );
    }

    return (
        <>
            <BarChartCard
                title={t('repository_insights.activity')}
                icon="ChartColumn"
                emptyText={t('repository_insights.activity_empty')}
                items={weeks.map((week) => ({
                    key: week.weekStart,
                    label: new Date(week.weekStart).toLocaleDateString(locale, {
                        day: 'numeric',
                        month: 'short',
                    }),
                    value: week.total,
                }))}
                summary={
                    weeks.length > 0 ? (
                        <span>
                            {t('repository_insights.activity_summary', {
                                count: recentCommitCount(weeks, ACTIVITY_WEEKS),
                                weeks: ACTIVITY_WEEKS,
                            })}
                        </span>
                    ) : undefined
                }
            />

            <section
                aria-labelledby="development-contributors"
                className="rounded-2xl border border-(--border-color) bg-(--surface-color) p-4 sm:p-5"
            >
                <div id="development-contributors">
                    <CardHeader
                        icon="Users"
                        title={t('repository_insights.contributors')}
                    />
                </div>
                {top.length === 0 ? (
                    <p className="mt-3 text-sm text-(--text-gray-color)">
                        {t('repository_insights.contributors_empty')}
                    </p>
                ) : (
                    <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0">
                        {top.map((person) => (
                            <li
                                key={person.login}
                                className="flex items-center gap-2.5"
                            >
                                <Avatar
                                    src={person.avatarUrl}
                                    alt={person.login}
                                    initials={person.login
                                        .slice(0, 2)
                                        .toUpperCase()}
                                    size="sm"
                                />
                                <a
                                    href={person.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-24 shrink-0 truncate text-xs font-medium text-(--text-color) hover:text-(--accent-color) focus-visible:text-(--accent-color)"
                                >
                                    {person.login}
                                </a>
                                <span
                                    aria-hidden="true"
                                    className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-(--bg-light-color)"
                                >
                                    <span
                                        className="block h-full rounded-full bg-(--accent-color)"
                                        style={{
                                            width: `${(person.contributions / most) * 100}%`,
                                        }}
                                    />
                                </span>
                                <span className="w-10 shrink-0 text-right text-xs text-(--text-gray-color) tabular-nums">
                                    {person.contributions}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section
                aria-labelledby="development-languages"
                className="rounded-2xl border border-(--border-color) bg-(--surface-color) p-4 sm:p-5"
            >
                <div id="development-languages">
                    <CardHeader
                        icon="Code"
                        title={t('repository_insights.languages')}
                    />
                </div>
                <div className="mt-3">
                    {shares.length === 0 ? (
                        <p className="text-sm text-(--text-gray-color)">
                            {t('repository_insights.languages_empty')}
                        </p>
                    ) : (
                        <LanguageBar shares={shares} />
                    )}
                </div>
            </section>
        </>
    );
}
