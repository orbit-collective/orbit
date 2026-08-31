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

        expect(screen.getByText('Warning')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByText('All')).toHaveAttribute(
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
});
