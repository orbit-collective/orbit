import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import AccountSettingsProfilePreview from './AccountSettingsProfilePreview';

describe('AccountSettingsProfilePreview', () => {
    test('shows the three previews with the name and ends up visible after the entrance', async () => {
        render(
            <AccountSettingsProfilePreview
                name="Jane Cooper"
                avatarSrc={null}
                initials="J"
            />,
        );

        expect(screen.getByText('Sidebar')).toBeInTheDocument();
        expect(screen.getByText('Comment')).toBeInTheDocument();
        expect(screen.getByText('Issue row')).toBeInTheDocument();
        await waitFor(() =>
            expect(screen.getAllByText('Jane Cooper')[0]).toBeVisible(),
        );
        expect(
            screen.getAllByText('Jane Cooper').length,
        ).toBeGreaterThanOrEqual(2);
    });

    test('falls back to a placeholder name and initials without a photo', () => {
        render(
            <AccountSettingsProfilePreview
                name="  "
                avatarSrc={null}
                initials="?"
            />,
        );

        expect(screen.getAllByText('Your name').length).toBeGreaterThanOrEqual(
            2,
        );
        expect(screen.getAllByText('?').length).toBeGreaterThanOrEqual(3);
    });

    test('a new photo replaces the avatar in every preview', async () => {
        const { rerender } = render(
            <AccountSettingsProfilePreview
                name="Jane"
                avatarSrc="/a.png"
                initials="J"
            />,
        );
        expect(screen.getAllByAltText('Avatar')).toHaveLength(3);
        expect(screen.getAllByAltText('Avatar')[0]).toHaveAttribute(
            'src',
            '/a.png',
        );

        rerender(
            <AccountSettingsProfilePreview
                name="Jane"
                avatarSrc="/b.png"
                initials="J"
            />,
        );

        await waitFor(() =>
            screen
                .getAllByAltText('Avatar')
                .forEach((img) => expect(img).toHaveAttribute('src', '/b.png')),
        );
    });
});
