import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { buildBranch } from '@/tests/development';
import BranchesPanel, { BRANCHES_SHOWN } from './BranchesPanel';

const many = Array.from({ length: BRANCHES_SHOWN + 3 }, (_, index) =>
    buildBranch({
        name: `branch-${index}`,
        isDefault: index === 0,
        protected: false,
    }),
);

describe('BranchesPanel', () => {
    test('shows a placeholder while loading', () => {
        render(
            <BranchesPanel branches={null} error={null} onRetry={vi.fn()} />,
        );

        expect(
            screen.getByRole('status', { name: 'Loading branches' }),
        ).toBeInTheDocument();
    });

    test('shows the error with a way to retry', async () => {
        const onRetry = vi.fn();
        render(
            <BranchesPanel
                branches={null}
                error="GitHub is down"
                onRetry={onRetry}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('GitHub is down');
        await userEvent.click(
            screen.getByRole('button', { name: 'Try again' }),
        );
        expect(onRetry).toHaveBeenCalled();
    });

    test('says when there are no branches', () => {
        render(<BranchesPanel branches={[]} error={null} onRetry={vi.fn()} />);

        expect(
            screen.getByText('This repository has no branches.'),
        ).toBeInTheDocument();
    });

    test('shows the first few branches and expands to the rest', async () => {
        render(
            <BranchesPanel branches={many} error={null} onRetry={vi.fn()} />,
        );

        expect(screen.getAllByRole('listitem')).toHaveLength(BRANCHES_SHOWN);

        const more = screen.getByRole('button', { name: 'Show 3 more' });
        expect(more).toHaveAttribute('aria-expanded', 'false');
        await userEvent.click(more);

        expect(screen.getAllByRole('listitem')).toHaveLength(
            BRANCHES_SHOWN + 3,
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Show fewer' }),
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(BRANCHES_SHOWN);
    });

    test('offers to create a branch only when allowed', async () => {
        const onCreate = vi.fn();
        const { rerender } = render(
            <BranchesPanel branches={[]} error={null} onRetry={vi.fn()} />,
        );
        expect(
            screen.queryByRole('button', { name: 'Create a branch' }),
        ).not.toBeInTheDocument();

        rerender(
            <BranchesPanel
                branches={[]}
                error={null}
                onRetry={vi.fn()}
                onCreate={onCreate}
            />,
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Create a branch' }),
        );

        expect(onCreate).toHaveBeenCalled();
    });
});
