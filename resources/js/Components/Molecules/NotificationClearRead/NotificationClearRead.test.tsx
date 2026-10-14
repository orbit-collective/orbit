import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import NotificationClearRead from './NotificationClearRead';

describe('NotificationClearRead Component', () => {
    test('asks for confirmation before deleting', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<NotificationClearRead onConfirm={onConfirm} />);

        await user.click(screen.getByText('Delete all read'));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(
            screen.getByText('Delete every read notification?'),
        ).toBeInTheDocument();

        await user.click(screen.getByText('Delete'));

        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Delete all read')).toBeInTheDocument();
    });

    test('cancelling goes back without deleting', async () => {
        const user = userEvent.setup();
        const onConfirm = vi.fn();
        render(<NotificationClearRead onConfirm={onConfirm} />);

        await user.click(screen.getByText('Delete all read'));
        await user.click(screen.getByText('Cancel'));

        expect(onConfirm).not.toHaveBeenCalled();
        expect(screen.getByText('Delete all read')).toBeInTheDocument();
    });
});
