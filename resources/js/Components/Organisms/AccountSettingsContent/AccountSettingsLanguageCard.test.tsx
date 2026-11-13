import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsLanguageCard from './AccountSettingsLanguageCard';

const renderCard = (
    props: Partial<Parameters<typeof AccountSettingsLanguageCard>[0]> = {},
) => {
    const onSelect = vi.fn();
    render(
        <AccountSettingsLanguageCard
            code="pl"
            name="Polski"
            subtitle="Polish"
            selected={false}
            onSelect={onSelect}
            {...props}
        />,
    );

    return { onSelect };
};

describe('AccountSettingsLanguageCard', () => {
    test('shows the flag, the native name and the translated name', () => {
        renderCard();

        const card = screen.getByRole('button', { name: /Polski/ });
        expect(card.querySelector('svg')).toBeInTheDocument();
        expect(card).toHaveTextContent('Polish');
        expect(card).toHaveAttribute('aria-pressed', 'false');
    });

    test('hides the subtitle when it repeats the name', () => {
        renderCard({ code: 'en', name: 'English', subtitle: 'English' });

        expect(screen.getAllByText('English')).toHaveLength(1);
    });

    test('marks the selected card', () => {
        renderCard({ selected: true });

        expect(screen.getByRole('button')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByTestId('selection-highlight')).toBeInTheDocument();
    });

    test('is picked with a click, Enter and Space', async () => {
        const { onSelect } = renderCard();
        const card = screen.getByRole('button');

        await userEvent.click(card);
        card.focus();
        await userEvent.keyboard('{Enter}');
        await userEvent.keyboard(' ');

        expect(onSelect).toHaveBeenCalledTimes(3);
    });
});
