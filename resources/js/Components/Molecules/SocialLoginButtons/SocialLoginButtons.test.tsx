import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import SocialLoginButtons from './SocialLoginButtons';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name.replace(/\./g, '/')}`),
);

describe('SocialLoginButtons Component', () => {
    test('renders a control for each provider', () => {
        render(<SocialLoginButtons />);

        expect(
            screen.getAllByRole('button').length +
                screen.getAllByRole('link').length,
        ).toBe(3);
    });

    test('disables Google and Microsoft since they are not wired up yet', () => {
        render(<SocialLoginButtons />);

        expect(
            screen.getByLabelText('Continue with Google (coming soon)'),
        ).toBeDisabled();
        expect(
            screen.getByLabelText('Continue with Microsoft (coming soon)'),
        ).toBeDisabled();
    });

    test('links the GitHub control to the OAuth redirect route', () => {
        render(<SocialLoginButtons />);

        const githubLink = screen.getByLabelText('Continue with GitHub');

        expect(githubLink).toHaveAttribute('href', '/auth/github/redirect');
    });
});
