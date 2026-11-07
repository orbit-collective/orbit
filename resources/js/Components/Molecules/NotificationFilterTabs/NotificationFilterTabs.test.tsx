import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import NotificationFilterTabs from './NotificationFilterTabs';

describe('NotificationFilterTabs Component', () => {
    test('renders all filter tabs', () => {
        render(
            <NotificationFilterTabs activeFilter="all" onChange={() => {}} />,
        );

        expect(screen.getByText('All')).toBeInTheDocument();
        expect(screen.getByText('Success')).toBeInTheDocument();
        expect(screen.getByText('Info')).toBeInTheDocument();
        expect(screen.getByText('Warning')).toBeInTheDocument();
        expect(screen.getByText('Error')).toBeInTheDocument();
    });

    test('marks the active tab as pressed', () => {
        render(
            <NotificationFilterTabs
                activeFilter="warning"
                onChange={() => {}}
            />,
        );

        expect(screen.getByRole('button', { name: 'Warning' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    test('calls onChange with the clicked tab id', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(
            <NotificationFilterTabs activeFilter="all" onChange={onChange} />,
        );

        await user.click(screen.getByText('Error'));

        expect(onChange).toHaveBeenCalledWith('error');
    });

    test('one pill marks the active tab and moves with it', () => {
        const { rerender } = render(
            <NotificationFilterTabs activeFilter="all" onChange={() => {}} />,
        );
        expect(screen.getAllByTestId('notification-filter-pill')).toHaveLength(
            1,
        );

        rerender(
            <NotificationFilterTabs activeFilter="error" onChange={() => {}} />,
        );

        const pill = screen.getByTestId('notification-filter-pill');
        expect(pill.parentElement).toBe(
            screen.getByRole('button', { name: 'Error' }),
        );
    });
});
