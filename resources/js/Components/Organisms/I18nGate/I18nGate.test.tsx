import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import I18nGate from './I18nGate';

const i18n = vi.hoisted(() => ({ loading: false }));

vi.mock('laravel-react-i18n', () => ({
    useLaravelReactI18n: () => ({ loading: i18n.loading }),
}));

const Draft = () => {
    const [text, setText] = useState('');

    return (
        <input
            aria-label="draft"
            value={text}
            onChange={(event) => setText(event.target.value)}
        />
    );
};

describe('I18nGate', () => {
    test('renders nothing until the first language has loaded', () => {
        i18n.loading = true;
        render(
            <I18nGate>
                <p>app</p>
            </I18nGate>,
        );

        expect(screen.queryByText('app')).not.toBeInTheDocument();
    });

    test('keeps the app mounted while a later language loads', async () => {
        i18n.loading = false;
        const { rerender } = render(
            <I18nGate>
                <Draft />
            </I18nGate>,
        );

        await userEvent.type(screen.getByLabelText('draft'), 'unsaved');

        i18n.loading = true;
        rerender(
            <I18nGate>
                <Draft />
            </I18nGate>,
        );

        expect(screen.getByLabelText('draft')).toHaveValue('unsaved');
    });

    test('shows the app once loading finishes', () => {
        i18n.loading = true;
        const { rerender } = render(
            <I18nGate>
                <p>app</p>
            </I18nGate>,
        );

        i18n.loading = false;
        rerender(
            <I18nGate>
                <p>app</p>
            </I18nGate>,
        );

        expect(screen.getByText('app')).toBeInTheDocument();
    });
});
