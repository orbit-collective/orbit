import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import TabSelection from './TabSelection';

const tabs = [{ name: 'Comments', count: 3 }, { name: 'Activity' }];

describe('TabSelection Component', () => {
    test('renders every tab', () => {
        render(
            <TabSelection
                tabs={tabs}
                selectedTab="Comments"
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
                onSelectTab={onSelectTab}
            />,
        );

        await user.click(screen.getByRole('tab', { name: 'Activity' }));

        expect(onSelectTab).toHaveBeenCalledWith('Activity');
    });
});
