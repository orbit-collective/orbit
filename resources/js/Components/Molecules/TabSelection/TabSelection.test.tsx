import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import TabSelection, { tabIds } from './TabSelection';

const tabs = [{ name: 'Comments', count: 3 }, { name: 'Activity' }];

describe('TabSelection Component', () => {
    test('renders every tab', () => {
        render(
            <TabSelection
                tabs={tabs}
                selectedTab="Comments"
                idPrefix="t"
                onSelectTab={() => {}}
            />,
        );

        expect(screen.getAllByRole('tab')).toHaveLength(2);
        expect(screen.getByText('Activity')).toBeInTheDocument();
    });

    test('marks only the selected tab', () => {
        render(
            <TabSelection
                tabs={tabs}
                selectedTab="Activity"
                idPrefix="t"
                onSelectTab={() => {}}
            />,
        );

        expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute(
            'aria-selected',
            'true',
        );
        expect(screen.getByRole('tab', { name: /Comments/ })).toHaveAttribute(
            'aria-selected',
            'false',
        );
    });

    test('shows a count only when given, including zero', () => {
        render(
            <TabSelection
                tabs={[{ name: 'Comments', count: 0 }, { name: 'Activity' }]}
                selectedTab="Comments"
                idPrefix="t"
                onSelectTab={() => {}}
            />,
        );

        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Activity' })).toHaveTextContent(
            /^Activity$/,
        );
    });

    test('calls onSelectTab with the tab name', async () => {
        const user = userEvent.setup();
        const onSelectTab = vi.fn();
        render(
            <TabSelection
                tabs={tabs}
                selectedTab="Comments"
                idPrefix="t"
                onSelectTab={onSelectTab}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Activity' }));

        expect(onSelectTab).toHaveBeenCalledWith('Activity');
    });

    describe('keyboard and aria wiring', () => {
        test('links every tab to its panel with stable ids', () => {
            render(
                <TabSelection
                    tabs={tabs}
                    selectedTab="Comments"
                    idPrefix="issue-tabs"
                    onSelectTab={() => {}}
                />,
            );

            const tab = screen.getByRole('tab', { name: 'Activity' });

            expect(tab).toHaveAttribute(
                'id',
                tabIds('issue-tabs', 'Activity').tab,
            );
            expect(tab).toHaveAttribute(
                'aria-controls',
                tabIds('issue-tabs', 'Activity').panel,
            );
        });

        test('only the selected tab is in the tab order', () => {
            render(
                <TabSelection
                    tabs={tabs}
                    selectedTab="Comments"
                    idPrefix="t"
                    onSelectTab={() => {}}
                />,
            );

            expect(
                screen.getByRole('tab', { name: /Comments/ }),
            ).toHaveAttribute('tabindex', '0');
            expect(
                screen.getByRole('tab', { name: 'Activity' }),
            ).toHaveAttribute('tabindex', '-1');
        });

        test('arrow keys move to the next and previous tab, wrapping around', async () => {
            const user = userEvent.setup();
            const onSelectTab = vi.fn();
            render(
                <TabSelection
                    tabs={tabs}
                    selectedTab="Comments"
                    idPrefix="t"
                    onSelectTab={onSelectTab}
                />,
            );

            screen.getByRole('tab', { name: /Comments/ }).focus();
            await user.keyboard('{ArrowRight}');
            expect(onSelectTab).toHaveBeenLastCalledWith('Activity');
            expect(screen.getByRole('tab', { name: 'Activity' })).toHaveFocus();

            await user.keyboard('{ArrowRight}');
            expect(onSelectTab).toHaveBeenLastCalledWith('Comments');

            await user.keyboard('{ArrowLeft}');
            expect(onSelectTab).toHaveBeenLastCalledWith('Activity');
        });

        test('Home and End jump to the first and last tab', async () => {
            const user = userEvent.setup();
            const onSelectTab = vi.fn();
            render(
                <TabSelection
                    tabs={tabs}
                    selectedTab="Comments"
                    idPrefix="t"
                    onSelectTab={onSelectTab}
                />,
            );

            screen.getByRole('tab', { name: /Comments/ }).focus();
            await user.keyboard('{End}');
            expect(onSelectTab).toHaveBeenLastCalledWith('Activity');

            await user.keyboard('{Home}');
            expect(onSelectTab).toHaveBeenLastCalledWith('Comments');
        });
    });

    test('one underline marks the selected tab and moves with it', () => {
        const { rerender } = render(
            <TabSelection
                tabs={tabs}
                selectedTab="Comments"
                idPrefix="t"
                onSelectTab={() => {}}
            />,
        );
        expect(screen.getAllByTestId('tab-underline')).toHaveLength(1);

        rerender(
            <TabSelection
                tabs={tabs}
                selectedTab="Activity"
                idPrefix="t"
                onSelectTab={() => {}}
            />,
        );

        expect(screen.getByTestId('tab-underline').parentElement).toBe(
            screen.getByRole('tab', { name: 'Activity' }),
        );
    });
});
