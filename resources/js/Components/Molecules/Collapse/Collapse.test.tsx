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

    test('unmountWhenClosed mounts only while open and removes the body after closing', async () => {
        const { rerender } = render(
            <Collapse open={false} unmountWhenClosed>
                <p>lazy</p>
            </Collapse>,
        );
        expect(screen.queryByText('lazy')).not.toBeInTheDocument();

        rerender(
            <Collapse open unmountWhenClosed>
                <p>lazy</p>
            </Collapse>,
        );
        expect(await screen.findByText('lazy')).toBeInTheDocument();

        rerender(
            <Collapse open={false} unmountWhenClosed>
                <p>lazy</p>
            </Collapse>,
        );
        await waitFor(() =>
            expect(screen.queryByText('lazy')).not.toBeInTheDocument(),
        );
    });

    test('a folded body keeps an open nested Collapse out of the tab order', async () => {
        const { rerender } = render(
            <Collapse open>
                <Collapse open>
                    <button>deep</button>
                </Collapse>
            </Collapse>,
        );

        rerender(
            <Collapse open={false}>
                <Collapse open>
                    <button>deep</button>
                </Collapse>
            </Collapse>,
        );

        await waitFor(() =>
            expect(screen.getByText('deep').closest('[inert]')).not.toBeNull(),
        );
    });
});
