import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsLayout from './SettingsLayout';

vi.mock('@/Components/Organisms/Sidebar/Sidebar', () => ({
    default: ({ projects }: { projects: unknown[] }) => (
        <div data-testid="sidebar" data-projects-count={projects.length} />
    ),
}));

vi.mock('@inertiajs/react', () => ({
    Link: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href?: string;
    }) => <a href={href}>{children}</a>,
}));

describe('SettingsLayout', () => {
    test('renders the heading and description of the given tab', () => {
        render(
            <SettingsLayout tabId="labels">
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(
            screen.getByRole('heading', { name: 'Labels', level: 1 }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(
                'Define label taxonomy used across issues and projects.',
            ),
        ).toBeInTheDocument();
        expect(screen.getByText('Tab body')).toBeInTheDocument();
    });

    test('passes the projects through to the sidebar', () => {
        render(
            <SettingsLayout
                tabId="preferences"
                projects={[{ id: 1 }, { id: 2 }] as never}
            >
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(screen.getByTestId('sidebar')).toHaveAttribute(
            'data-projects-count',
            '2',
        );
    });

    test('caps content width by default, but not for a fullBleed tab', () => {
        const { container, rerender } = render(
            <SettingsLayout tabId="labels">
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(container.querySelector('.max-w-3xl')).toBeInTheDocument();

        rerender(
            <SettingsLayout tabId="labels" fullBleed>
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(container.querySelector('.max-w-3xl')).not.toBeInTheDocument();
    });

    describe('foldable panels', () => {
        beforeEach(() => localStorage.clear());

        const twoPanels = (
            <>
                <SettingsPanel id="one" title="One" icon="Tag">
                    <p>first body</p>
                </SettingsPanel>
                <SettingsPanel id="two" title="Two" icon="Tag">
                    <p>second body</p>
                </SettingsPanel>
            </>
        );

        test('offers Collapse all once two panels can fold, and folds them all', async () => {
            render(<SettingsLayout tabId="labels">{twoPanels}</SettingsLayout>);

            fireEvent.click(
                await screen.findByRole('button', { name: 'Collapse all' }),
            );

            expect(screen.getByRole('button', { name: /One/ })).toHaveAttribute(
                'aria-expanded',
                'false',
            );
            expect(screen.getByRole('button', { name: /Two/ })).toHaveAttribute(
                'aria-expanded',
                'false',
            );

            fireEvent.click(
                await screen.findByRole('button', { name: 'Expand all' }),
            );
            expect(screen.getByRole('button', { name: /One/ })).toHaveAttribute(
                'aria-expanded',
                'true',
            );
        });

        test('a single foldable panel does not need Collapse all', () => {
            render(
                <SettingsLayout tabId="labels">
                    <SettingsPanel id="only" title="Only" icon="Tag">
                        <p>body</p>
                    </SettingsPanel>
                </SettingsLayout>,
            );

            expect(
                screen.queryByRole('button', { name: /all/i }),
            ).not.toBeInTheDocument();
        });

        test('panels without an id never count', () => {
            render(
                <SettingsLayout tabId="labels">
                    <SettingsPanel title="A">
                        <p>a</p>
                    </SettingsPanel>
                    <SettingsPanel title="B">
                        <p>b</p>
                    </SettingsPanel>
                </SettingsLayout>,
            );

            expect(
                screen.queryByRole('button', { name: /all/i }),
            ).not.toBeInTheDocument();
        });

        test('a full-bleed tab has no Collapse all', () => {
            render(
                <SettingsLayout tabId="labels" fullBleed>
                    {twoPanels}
                </SettingsLayout>,
            );

            expect(
                screen.queryByRole('button', { name: /all/i }),
            ).not.toBeInTheDocument();
        });

        test('each tab remembers its panels separately', () => {
            const first = render(
                <SettingsLayout tabId="labels">{twoPanels}</SettingsLayout>,
            );
            fireEvent.click(screen.getByRole('button', { name: /One/ }));
            first.unmount();

            render(
                <SettingsLayout tabId="priorities">{twoPanels}</SettingsLayout>,
            );
            expect(screen.getByRole('button', { name: /One/ })).toHaveAttribute(
                'aria-expanded',
                'true',
            );

            render(<SettingsLayout tabId="labels">{twoPanels}</SettingsLayout>);
            expect(
                screen.getAllByRole('button', { name: /One/ })[1],
            ).toHaveAttribute('aria-expanded', 'false');
        });
    });

    test('the heading and the content end up visible after the entrance', async () => {
        render(
            <SettingsLayout tabId="labels">
                <p>Tab body</p>
            </SettingsLayout>,
        );

        expect(
            await screen.findByRole('heading', { name: 'Labels', level: 1 }),
        ).toBeVisible();
        expect(screen.getByText('Tab body')).toBeVisible();
    });
});
