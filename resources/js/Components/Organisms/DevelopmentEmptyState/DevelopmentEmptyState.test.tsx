import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import DevelopmentEmptyState from './DevelopmentEmptyState';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: { integration: string }) =>
            `/${name}/${params.integration}`,
    ),
);

describe('DevelopmentEmptyState', () => {
    test('invites a configurer to connect GitHub', () => {
        render(<DevelopmentEmptyState kind="not_connected" canConfigure />);

        expect(
            screen.getByRole('heading', {
                name: 'Connect GitHub to see development here',
            }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Connect GitHub' }),
        ).toHaveAttribute('href', '/settings.integrations.show/github');
    });

    test('invites a configurer to add a repository', () => {
        render(<DevelopmentEmptyState kind="no_repositories" canConfigure />);

        expect(
            screen.getByRole('heading', { name: 'Add a repository' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'Add a repository' }),
        ).toBeInTheDocument();
    });

    test('sends everyone else to an admin instead of a link they cannot use', () => {
        render(
            <DevelopmentEmptyState kind="not_connected" canConfigure={false} />,
        );

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
        expect(
            screen.getByText(
                'Ask a project admin to set this up in the integration settings.',
            ),
        ).toBeInTheDocument();
    });
});
