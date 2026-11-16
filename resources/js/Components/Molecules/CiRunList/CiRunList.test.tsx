import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { buildCi } from '@/tests/development';
import CiRunList from './CiRunList';

describe('CiRunList', () => {
    test('says so when there are no checks', () => {
        render(<CiRunList runs={[]} />);

        expect(
            screen.getByText('This commit has no checks.'),
        ).toBeInTheDocument();
    });

    test('lists every run with its result, duration and a link to the run', () => {
        render(<CiRunList runs={buildCi().runs} />);

        const rows = screen.getAllByRole('listitem');
        expect(rows).toHaveLength(2);
        expect(within(rows[0]).getByText('build')).toBeInTheDocument();
        expect(within(rows[0]).getByText('1m 35s')).toBeInTheDocument();
        expect(within(rows[0]).getByText('Checks passed:')).toHaveClass(
            'sr-only',
        );
        expect(
            screen.getByRole('link', { name: 'Open build on GitHub' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/actions/runs/1',
        );
        // A run without a URL has no link, and one without a duration none shown.
        expect(
            screen.queryByRole('link', { name: 'Open lint on GitHub' }),
        ).not.toBeInTheDocument();
    });

    test('spins a running check', () => {
        const { container } = render(
            <CiRunList
                runs={[
                    {
                        name: 'build',
                        state: 'pending',
                        url: null,
                        durationSeconds: null,
                    },
                ]}
            />,
        );

        expect(container.querySelector('svg')).toHaveClass('animate-spin');
        expect(screen.getByText('Checks running:')).toBeInTheDocument();
    });
});
