import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
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
});
