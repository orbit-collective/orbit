import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import Error from './Error';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        Head: () => null,
        router: { reload: vi.fn(), on: () => () => {} },
        usePage: () => ({ props: { auth: { user: { id: 1 } } } }),
        Link: ({ children, href, className }: Record<string, unknown>) =>
            React.createElement('a', { href, className }, children as never),
    };
});

describe('Error Page', () => {
    test('renders the screen for the given status', () => {
        render(<Error status={404} path="/nope" />);

        expect(
            screen.getByRole('heading', { name: '404 - Page not found' }),
        ).toBeInTheDocument();
        expect(screen.getByText('/nope')).toBeInTheDocument();
    });
});
