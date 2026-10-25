import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test } from 'vitest';
import { AccentProvider } from '@/context/AccentContext';
import { ThemeProvider } from '@/context/ThemeContext';
import AccountSettingsPreferencesTab from './AccountSettingsPreferencesTab';

const renderTab = () =>
    render(
        <ThemeProvider>
            <AccentProvider>
                <AccountSettingsPreferencesTab />
            </AccentProvider>
        </ThemeProvider>,
    );

const accentVar = () =>
    document.documentElement.style.getPropertyValue('--accent-color');

describe('AccountSettingsPreferencesTab accent color', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.removeAttribute('style');
    });

    test('offers the shared color picker, with the project colors as quick picks', () => {
        renderTab();

        expect(screen.getByText('Accent color')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Use color #3b82f6' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'More colors' }),
        ).toBeInTheDocument();
    });

    test('starts on the theme accent', () => {
        renderTab();

        expect(
            screen.getByRole('button', { name: 'Use color #8844da' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });

    test('picking a project color applies it and stores its name', async () => {
        const user = userEvent.setup();
        renderTab();

        await user.click(
            screen.getByRole('button', { name: 'Use color #3b82f6' }),
        );

        expect(accentVar()).toBe('#3b82f6');
        expect(localStorage.getItem('accentColor')).toBe('blue');
    });

    test('picking the theme accent again goes back to following the theme', async () => {
        const user = userEvent.setup();
        renderTab();

        await user.click(
            screen.getByRole('button', { name: 'Use color #3b82f6' }),
        );
        await user.click(
            screen.getByRole('button', { name: 'Use color #8844da' }),
        );

        expect(accentVar()).toBe('');
        expect(localStorage.getItem('accentColor')).toBe('default');
    });

    test('a hex typed into the full picker becomes a custom accent', async () => {
        const user = userEvent.setup();
        renderTab();

        await user.click(screen.getByRole('button', { name: 'More colors' }));
        const hex = screen.getByLabelText('Hex color');
        await user.clear(hex);
        await user.type(hex, '#00AA99');

        expect(accentVar()).toBe('#00aa99');
        expect(localStorage.getItem('accentColor')).toBe('#00aa99');
    });

    test('an accent stored from before still shows as the selected color', () => {
        localStorage.setItem('accentColor', 'pink');
        renderTab();

        expect(
            screen.getByRole('button', { name: 'Use color #ec4899' }),
        ).toHaveAttribute('aria-pressed', 'true');
    });
});
