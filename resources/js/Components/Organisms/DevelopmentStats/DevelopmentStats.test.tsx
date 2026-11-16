import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { buildCi, buildInsights, buildPullRequest } from '@/tests/development';
import DevelopmentStats from './DevelopmentStats';

const card = (title: string) =>
    screen.getByText(title).closest('div')!.parentElement!.parentElement!;

describe('DevelopmentStats', () => {
    test('shows skeletons, not numbers, until the data is there', () => {
        render(<DevelopmentStats pullRequests={null} insights={null} />);

        expect(screen.getAllByTestId('skeleton')).toHaveLength(5);
        expect(screen.queryByText('—')).not.toBeInTheDocument();
        expect(screen.getByRole('list')).toHaveAttribute('aria-busy', 'true');
    });

    test('counts open pull requests and those waiting for a review', () => {
        render(
            <DevelopmentStats
                pullRequests={[
                    buildPullRequest({
                        number: 1,
                        requestedReviewers: [{ login: 'bob', avatarUrl: '' }],
                    }),
                    buildPullRequest({
                        number: 2,
                        draft: true,
                        requestedReviewers: [{ login: 'bob', avatarUrl: '' }],
                    }),
                    buildPullRequest({ number: 3, state: 'closed' }),
                ]}
                insights={null}
            />,
        );

        expect(
            within(card('Open pull requests')).getByText('2'),
        ).toBeInTheDocument();
        expect(screen.getByText('1 waiting for review')).toBeInTheDocument();
    });

    test('counts what was merged in the last week only', () => {
        const day = 86_400_000;
        render(
            <DevelopmentStats
                pullRequests={[
                    buildPullRequest({
                        number: 1,
                        state: 'merged',
                        mergedAt: new Date(Date.now() - 2 * day).toISOString(),
                    }),
                    buildPullRequest({
                        number: 2,
                        state: 'merged',
                        mergedAt: new Date(Date.now() - 20 * day).toISOString(),
                    }),
                ]}
                insights={null}
            />,
        );

        expect(
            within(card('Merged this week')).getByText('1'),
        ).toBeInTheDocument();
    });

    test('shows the share of passing checks, coloured by how healthy it is', () => {
        const failed = buildCi({ state: 'failed' });
        render(
            <DevelopmentStats
                pullRequests={[
                    buildPullRequest({ number: 1 }),
                    buildPullRequest({ number: 2, ci: failed }),
                ]}
                insights={null}
            />,
        );

        expect(
            within(card('Checks passing')).getByText('50%', { selector: 'h4' }),
        ).toBeInTheDocument();
    });

    test('shows no pass rate without decided checks', () => {
        render(
            <DevelopmentStats
                pullRequests={[buildPullRequest({ ci: null })]}
                insights={null}
            />,
        );

        expect(
            within(card('Checks passing')).getByText('—'),
        ).toBeInTheDocument();
    });

    test('takes commits and contributors from the insights', () => {
        render(
            <DevelopmentStats pullRequests={[]} insights={buildInsights()} />,
        );

        // 12 weeks of 1..12 commits; the last four are 9+10+11+12.
        expect(within(card('Commits')).getByText('42')).toBeInTheDocument();
        expect(within(card('Contributors')).getByText('2')).toBeInTheDocument();
    });
});
