import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AccentProvider } from '@/context/AccentContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { inSettingsPage } from '@/tests/settingsPanels';
import AccountSettingsPreferencesTab from './AccountSettingsPreferencesTab';

const i18n = vi.hoisted(() => ({ locale: 'en', setLocale: vi.fn() }));

vi.mock('laravel-react-i18n', async () => {
    const { loadTranslations } = await import('@/tests/langFiles');
    const texts = loadTranslations('en');

    return {
        useLaravelReactI18n: () => ({
            t: (key: string, replacements: Record<string, string> = {}) =>
                Object.entries(replacements).reduce(
                    (text, [name, value]) => text.replaceAll(`:${name}`, value),
                    texts[key] ?? key,
                ),
            tChoice: (key: string) => texts[key] ?? key,
            currentLocale: () => i18n.locale,
            setLocale: i18n.setLocale,
        }),
    };
});

const renderTab = () =>
    render(
        inSettingsPage(
            <ThemeProvider>
                <AccentProvider>
                    <AccountSettingsPreferencesTab />
                </AccentProvider>
            </ThemeProvider>,
            'preferences',
        ),
    );

describe('AccountSettingsPreferencesTab language', () => {
    beforeEach(() => {
        localStorage.clear();
        i18n.locale = 'en';
    });

    test('offers every language with its flag and marks the active one', () => {
        i18n.locale = 'pl';
        renderTab();

        const group = screen.getByRole('group', { name: 'Language' });
        expect(group).toBeInTheDocument();
        expect(
            screen
                .getByRole('button', { name: /English/ })
                .querySelector('svg'),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Polski/ }).querySelector('svg'),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Polski/ })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: /English/ })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    test('picking a language applies it and remembers it', async () => {
        renderTab();

        await userEvent.click(screen.getByRole('button', { name: /Polski/ }));

        expect(i18n.setLocale).toHaveBeenCalledWith('pl');
        expect(localStorage.getItem('locale')).toBe('pl');
    });

    test('Tab reaches every language, not only the selected one', async () => {
        renderTab();
        const english = screen.getByRole('button', { name: /English/ });
        const polish = screen.getByRole('button', { name: /Polski/ });

        english.focus();
        await userEvent.tab();

        expect(polish).toHaveFocus();
        expect(i18n.setLocale).not.toHaveBeenCalled();
    });

    test('arrow keys move focus without switching the language', async () => {
        renderTab();
        const english = screen.getByRole('button', { name: /English/ });
        const polish = screen.getByRole('button', { name: /Polski/ });

        english.focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(polish).toHaveFocus();

        await userEvent.keyboard('{ArrowLeft}');
        expect(english).toHaveFocus();
        expect(i18n.setLocale).not.toHaveBeenCalled();
    });

    test('Enter on a focused language picks it', async () => {
        renderTab();

        screen.getByRole('button', { name: /Polski/ }).focus();
        await userEvent.keyboard('{Enter}');

        expect(i18n.setLocale).toHaveBeenCalledWith('pl');
    });

    test('a folded panel names the current language', async () => {
        renderTab();

        await userEvent.click(screen.getByRole('button', { name: /Language/ }));

        expect(
            screen
                .getAllByTestId('collapsed-summary')
                .some((node) => node.textContent === 'English'),
        ).toBe(true);
    });
});
