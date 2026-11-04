import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';

describe('SettingsPanel', () => {
    test('renders its title, description and content', () => {
        render(
            <SettingsPanel title="Labels" description="Taxonomy" icon="Tag">
                <p>row</p>
            </SettingsPanel>,
        );

        expect(
            screen.getByRole('heading', { name: 'Labels' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Taxonomy')).toBeInTheDocument();
        expect(screen.getByText('row')).toBeVisible();
    });

    test('works without an icon', () => {
        render(
            <SettingsPanel title="Plain" description="No icon">
                <p>row</p>
            </SettingsPanel>,
        );

        expect(
            screen.getByRole('heading', { name: 'Plain' }),
        ).toBeInTheDocument();
    });

    test('is not collapsible unless asked', () => {
        render(
            <SettingsPanel title="Labels" icon="Tag">
                <p>row</p>
            </SettingsPanel>,
        );

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('collapses its rows, shows the summary and toggles', () => {
        const toggle = vi.fn();
        render(
            <SettingsPanel
                title="Users"
                icon="Users"
                description="Everyone"
                collapsed
                collapsedSummary="14 users"
                onToggleCollapse={toggle}
            >
                <p>row</p>
            </SettingsPanel>,
        );

        expect(screen.getByText('row')).not.toBeVisible();
        expect(screen.queryByText('Everyone')).not.toBeInTheDocument();
        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            '14 users',
        );

        fireEvent.click(screen.getByRole('button', { name: /Users/ }));
        expect(toggle).toHaveBeenCalledTimes(1);
    });
});
