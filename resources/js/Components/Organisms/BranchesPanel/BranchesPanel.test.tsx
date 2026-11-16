import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { buildBranch } from '@/tests/development';
import BranchesPanel from './BranchesPanel';

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: vi.fn() }),
}));

const PAGE = 6;

const pageOf = (count: number) =>
    Array.from({ length: count }, (_, index) =>
        buildBranch({
            name: `branch-${index}`,
            isDefault: index === 0,
            protected: false,
        }),
    );

const base = {
    total: 0,
    page: 1,
    perPage: PAGE,
    perPageOptions: [6, 12, 24],
    onPageChange: vi.fn(),
    onPerPageChange: vi.fn(),
    error: null,
    onRetry: vi.fn(),
};

describe('BranchesPanel', () => {
    test('shows a skeleton list while the page is loading', () => {
        render(<BranchesPanel {...base} branches={null} />);

        expect(
            screen.getByRole('status', { name: 'Loading branches' }),
        ).toBeInTheDocument();
        expect(screen.getAllByTestId('skeleton')).toHaveLength(PAGE);
    });

    test('shows the error with a way to retry', async () => {
        const onRetry = vi.fn();
        render(
            <BranchesPanel
                {...base}
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
        render(<BranchesPanel {...base} branches={[]} />);

        expect(
            screen.getByText('This repository has no branches.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });

    test('shows one page and pages through the rest with the real total', async () => {
        const onPageChange = vi.fn();
        render(
            <BranchesPanel
                {...base}
                branches={pageOf(PAGE)}
                total={134}
                page={2}
                onPageChange={onPageChange}
            />,
        );

        expect(screen.getAllByRole('listitem')).toHaveLength(PAGE);
        expect(screen.getByText(/Showing/)).toHaveTextContent(
            'Showing 7 to 12 of 134 results',
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Next page' }),
        );
        expect(onPageChange).toHaveBeenCalledWith(3);
    });

    test('offers to create a branch only when allowed', async () => {
        const onCreate = vi.fn();
        const { rerender } = render(<BranchesPanel {...base} branches={[]} />);
        expect(
            screen.queryByRole('button', { name: 'Create a branch' }),
        ).not.toBeInTheDocument();

        rerender(<BranchesPanel {...base} branches={[]} onCreate={onCreate} />);
        await userEvent.click(
            screen.getByRole('button', { name: 'Create a branch' }),
        );

        expect(onCreate).toHaveBeenCalled();
    });

    test('reports a new page size', async () => {
        const onPerPageChange = vi.fn();
        render(
            <BranchesPanel
                {...base}
                branches={pageOf(PAGE)}
                total={134}
                onPerPageChange={onPerPageChange}
            />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: /Rows per page/ }),
        );
        await userEvent.click(
            await screen.findByRole('menuitemradio', { name: /12/ }),
        );

        expect(onPerPageChange).toHaveBeenCalledWith(12);
    });
});
