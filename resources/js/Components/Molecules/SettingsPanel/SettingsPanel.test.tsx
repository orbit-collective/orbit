import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { SettingsSectionsProvider } from '@/context/SettingsSectionsContext';
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

    describe('inside a settings page', () => {
        beforeEach(() => localStorage.clear());

        const renderIn = (
            ui: React.ReactElement,
            key = 'settings-sections:t',
        ) =>
            render(
                <SettingsSectionsProvider storageKey={key}>
                    {ui}
                </SettingsSectionsProvider>,
            );

        test('a panel with an id folds from its header and remembers it', () => {
            const first = renderIn(
                <SettingsPanel id="alpha" title="Alpha" icon="Tag">
                    <p>row</p>
                </SettingsPanel>,
            );
            const header = screen.getByRole('button', { name: /Alpha/ });
            expect(header).toHaveAttribute('aria-expanded', 'true');

            fireEvent.click(header);
            expect(header).toHaveAttribute('aria-expanded', 'false');
            first.unmount();

            renderIn(
                <SettingsPanel id="alpha" title="Alpha" icon="Tag">
                    <p>row</p>
                </SettingsPanel>,
            );
            expect(
                screen.getByRole('button', { name: /Alpha/ }),
            ).toHaveAttribute('aria-expanded', 'false');
        });

        test('a panel without an id stays fixed, even without an icon', () => {
            renderIn(
                <SettingsPanel title="Fixed">
                    <p>row</p>
                </SettingsPanel>,
            );

            expect(screen.queryByRole('button')).not.toBeInTheDocument();
            expect(
                screen.getByRole('heading', { name: 'Fixed' }),
            ).toBeInTheDocument();
        });

        test('an icon-less panel with an id folds too', () => {
            renderIn(
                <SettingsPanel id="plain" title="Plain">
                    <p>row</p>
                </SettingsPanel>,
            );

            fireEvent.click(screen.getByRole('button', { name: /Plain/ }));

            expect(
                screen.getByRole('button', { name: /Plain/ }),
            ).toHaveAttribute('aria-expanded', 'false');
        });

        test('defaultCollapsed is the first-visit state, with its summary', () => {
            renderIn(
                <SettingsPanel
                    id="d"
                    title="Danger"
                    defaultCollapsed
                    collapsedSummary="3 items"
                >
                    <p>row</p>
                </SettingsPanel>,
            );

            expect(
                screen.getByRole('button', { name: /Danger/ }),
            ).toHaveAttribute('aria-expanded', 'false');
            expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
                '3 items',
            );
        });

        test('a parent that controls collapsing wins over the id', () => {
            const toggle = vi.fn();
            renderIn(
                <SettingsPanel
                    id="x"
                    title="Ctl"
                    collapsed
                    onToggleCollapse={toggle}
                >
                    <p>row</p>
                </SettingsPanel>,
            );

            fireEvent.click(screen.getByRole('button', { name: /Ctl/ }));

            expect(toggle).toHaveBeenCalledTimes(1);
            expect(screen.getByRole('button', { name: /Ctl/ })).toHaveAttribute(
                'aria-expanded',
                'false',
            );
        });
    });

    test('an id outside a settings page does nothing', () => {
        render(
            <SettingsPanel id="orphan" title="Orphan">
                <p>row</p>
            </SettingsPanel>,
        );

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});
