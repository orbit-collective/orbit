import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Reveal from './Reveal';

describe('Reveal', () => {
    test('renders its children and ends up visible', async () => {
        render(
            <Reveal className="box">
                <p>hello</p>
            </Reveal>,
        );

        expect(screen.getByText('hello').parentElement).toHaveClass('box');
        await waitFor(() => expect(screen.getByText('hello')).toBeVisible());
    });

    test('a new key replays the reveal for the new content', async () => {
        const { rerender } = render(
            <Reveal key="loading">
                <p>loading</p>
            </Reveal>,
        );

        rerender(
            <Reveal key="data">
                <p>data</p>
            </Reveal>,
        );

        await waitFor(() => expect(screen.getByText('data')).toBeVisible());
        expect(screen.queryByText('loading')).not.toBeInTheDocument();
    });
});
