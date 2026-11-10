import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { bumpRefreshEpoch } from '@/utils/refreshEpoch';
import RowReveal from './RowReveal';

describe('RowReveal', () => {
    test('renders its children in an element with the given classes and ends up visible', async () => {
        render(
            <RowReveal className="row">
                <p>content</p>
            </RowReveal>,
        );

        expect(screen.getByText('content').parentElement).toHaveClass('row');
        await waitFor(() => expect(screen.getByText('content')).toBeVisible());
    });

    test('a long list still ends up fully visible', async () => {
        render(
            <>
                {Array.from({ length: 30 }, (_, i) => (
                    <RowReveal key={i} index={i}>
                        <p>row {i}</p>
                    </RowReveal>
                ))}
            </>,
        );

        await waitFor(() => expect(screen.getByText('row 29')).toBeVisible());
    });

    test('in a grid, fill makes the child stretch to the cell (width and height)', () => {
        render(
            <RowReveal fill>
                <button>card</button>
            </RowReveal>,
        );

        const wrapper = screen.getByRole('button').parentElement!;
        expect(wrapper.className).toContain('h-full');
        expect(wrapper.className).toContain('*:w-full');
        expect(wrapper.className).toContain('*:h-full');
    });

    test('without fill the wrapper adds no sizing of its own', () => {
        render(
            <RowReveal className="row">
                <button>card</button>
            </RowReveal>,
        );

        expect(
            screen.getByRole('button').parentElement!.className,
        ).not.toContain('h-full');
    });

    test('a refresh plays the entrance again by remounting the row', async () => {
        render(
            <RowReveal>
                <p>row</p>
            </RowReveal>,
        );
        await waitFor(() => expect(screen.getByText('row')).toBeVisible());
        const before = screen.getByText('row');

        act(() => bumpRefreshEpoch());

        expect(screen.getByText('row')).not.toBe(before);
        await waitFor(() => expect(screen.getByText('row')).toBeVisible());
    });
});
