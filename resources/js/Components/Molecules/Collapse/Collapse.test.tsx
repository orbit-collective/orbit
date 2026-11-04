import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Collapse from './Collapse';

describe('Collapse', () => {
    test('shows its content when open', () => {
        render(
            <Collapse open id="body">
                <button>inside</button>
            </Collapse>,
        );

        expect(screen.getByRole('button', { name: 'inside' })).toBeVisible();
        expect(document.getElementById('body')).toBeInTheDocument();
    });

    test('starts closed without animating, hidden from users and the tab order', () => {
        render(
            <Collapse open={false}>
                <button>inside</button>
            </Collapse>,
        );

        expect(screen.getByText('inside')).not.toBeVisible();
        expect(
            screen.queryByRole('button', { name: 'inside' }),
        ).not.toBeInTheDocument();
    });

    test('keeps its children mounted while closed', () => {
        const { rerender } = render(
            <Collapse open>
                <input defaultValue="typed" />
            </Collapse>,
        );
        const input = screen.getByDisplayValue('typed');

        rerender(
            <Collapse open={false}>
                <input defaultValue="typed" />
            </Collapse>,
        );

        expect(screen.getByDisplayValue('typed')).toBe(input);
    });

    test('closes and reopens when toggled', async () => {
        const { rerender } = render(
            <Collapse open>
                <p>body</p>
            </Collapse>,
        );

        rerender(
            <Collapse open={false}>
                <p>body</p>
            </Collapse>,
        );
        await waitFor(() => expect(screen.getByText('body')).not.toBeVisible());

        rerender(
            <Collapse open>
                <p>body</p>
            </Collapse>,
        );
        await waitFor(() => expect(screen.getByText('body')).toBeVisible());
    });
});
