import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ListPager from './ListPager';

const renderPager = (
    overrides: Partial<Parameters<typeof ListPager>[0]> = {},
) => {
    const onPageChange = vi.fn();
    render(
        <ListPager
            label="Branches"
            page={2}
            pageSize={6}
            total={20}
            onPageChange={onPageChange}
            {...overrides}
        />,
    );

    return onPageChange;
};

describe('ListPager', () => {
    test('says which items are shown and which page it is', () => {
        renderPager();

        expect(
            screen.getByRole('navigation', { name: 'Branches' }),
        ).toBeInTheDocument();
        expect(screen.getByText('7–12 of 20')).toBeInTheDocument();
        expect(screen.getByText('2 / 4')).toBeInTheDocument();
    });

    test('moves one page back or forward', async () => {
        const onPageChange = renderPager();

        await userEvent.click(
            screen.getByRole('button', { name: 'Previous page' }),
        );
        await userEvent.click(
            screen.getByRole('button', { name: 'Next page' }),
        );

        expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
        expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
    });

    test('stops at the ends and clips the last range to the total', () => {
        const { unmount } = render(
            <ListPager
                label="x"
                page={1}
                pageSize={6}
                total={20}
                onPageChange={vi.fn()}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Previous page' }),
        ).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Next page' })).toBeEnabled();
        unmount();

        render(
            <ListPager
                label="x"
                page={4}
                pageSize={6}
                total={20}
                onPageChange={vi.fn()}
            />,
        );
        expect(
            screen.getByRole('button', { name: 'Next page' }),
        ).toBeDisabled();
        expect(screen.getByText('19–20 of 20')).toBeInTheDocument();
    });

    test('renders nothing when everything fits on one page', () => {
        renderPager({ page: 1, total: 6 });

        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    });
});
