import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsThemeCard from './AccountSettingsThemeCard';

const renderCard = (props = {}) =>
    render(
        <AccountSettingsThemeCard
            id="dark"
            label="Dark"
            subtitle="Orbit dark interface"
            selected={false}
            onSelect={vi.fn()}
            {...props}
        />,
    );

describe('AccountSettingsThemeCard', () => {
    test('shows its label and subtitle and reports a click', () => {
        const onSelect = vi.fn();
        renderCard({ onSelect });

        expect(screen.getByText('Dark')).toBeInTheDocument();
        expect(screen.getByText('Orbit dark interface')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button'));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    test('only the selected card carries the accent highlight', () => {
        const { rerender } = renderCard();
        expect(
            screen.queryByTestId('selection-highlight'),
        ).not.toBeInTheDocument();

        rerender(
            <AccountSettingsThemeCard
                id="dark"
                label="Dark"
                subtitle="s"
                selected
                groupId="theme"
                onSelect={vi.fn()}
            />,
        );

        expect(
            within(screen.getByRole('button')).getByTestId(
                'selection-highlight',
            ),
        ).toBeInTheDocument();
    });

    test.each(['dark', 'light', 'system'] as const)(
        'the %s mock-up draws itself and ends up visible',
        async (id) => {
            const { container } = renderCard({ id });

            const stage = container.querySelector(
                'button > div.relative > div:last-child',
            ) as HTMLElement;
            await waitFor(() => expect(stage).toBeVisible());
        },
    );

    test('the mock-up draws again when the card is picked', () => {
        const { container, rerender } = renderCard();
        const stage = () =>
            container.querySelector('button > div.relative > div:last-child');
        const first = stage();

        rerender(
            <AccountSettingsThemeCard
                id="dark"
                label="Dark"
                subtitle="s"
                selected
                onSelect={vi.fn()}
            />,
        );

        expect(stage()).not.toBe(first);
    });
});
