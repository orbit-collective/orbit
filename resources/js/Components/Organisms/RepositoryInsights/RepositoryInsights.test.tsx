import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { buildInsights } from '@/tests/development';
import RepositoryInsights from './RepositoryInsights';

describe('RepositoryInsights', () => {
    test('shows a placeholder while loading', () => {
        render(<RepositoryInsights insights={null} />);

        expect(
            screen.getByRole('status', {
                name: 'Loading repository statistics',
            }),
        ).toBeInTheDocument();
    });

    test('draws the commit activity of the last twelve weeks', () => {
        render(<RepositoryInsights insights={buildInsights()} />);

        expect(screen.getByText('Commit activity')).toBeInTheDocument();
        expect(screen.getByText('78 commits in 12 weeks')).toBeInTheDocument();
    });

    test('lists the top contributors with links and counts', () => {
        render(<RepositoryInsights insights={buildInsights()} />);

        expect(screen.getByRole('link', { name: 'ada' })).toHaveAttribute(
            'href',
            'https://github.com/ada',
        );
        expect(screen.getByText('120')).toBeInTheDocument();
        expect(screen.getByText('30')).toBeInTheDocument();
    });

    test('draws the languages as shares', () => {
        render(<RepositoryInsights insights={buildInsights()} />);

        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('60%')).toBeInTheDocument();
    });

    test('says so when GitHub has not computed a statistic yet', () => {
        render(
            <RepositoryInsights
                insights={buildInsights({
                    commitActivity: [],
                    contributors: [],
                    languages: [],
                })}
            />,
        );

        expect(
            screen.getByText(
                'GitHub is still calculating this. Check back in a moment.',
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByText('No contributors to show yet.'),
        ).toBeInTheDocument();
        expect(screen.getByText('No language data yet.')).toBeInTheDocument();
    });
});
