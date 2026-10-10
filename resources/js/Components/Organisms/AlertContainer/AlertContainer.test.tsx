import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AlertItem } from '@/types/Alert';
import { AlertContainer } from './AlertContainer';

describe('AlertContainer Component', () => {
    const alerts: AlertItem[] = [
        { id: '1', message: 'First alert', type: 'success' },
        { id: '2', message: 'Second alert', type: 'error' },
    ];

    test('renders nothing when there are no alerts', () => {
        render(<AlertContainer alerts={[]} removeAlert={() => {}} />);

        expect(screen.queryByText(/alert/i)).not.toBeInTheDocument();
    });

    test('renders an Alert for every item in the list', () => {
        render(<AlertContainer alerts={alerts} removeAlert={() => {}} />);

        expect(screen.getByText('First alert')).toBeInTheDocument();
        expect(screen.getByText('Second alert')).toBeInTheDocument();
    });

    test('calls removeAlert with the matching id when an alert is closed', async () => {
        const removeAlert = vi.fn();
        render(<AlertContainer alerts={alerts} removeAlert={removeAlert} />);

        const closeButtons = screen.getAllByRole('button', {
            name: /close alert/i,
        });
        await userEvent.click(closeButtons[1]);

        expect(removeAlert).toHaveBeenCalledTimes(1);
        expect(removeAlert).toHaveBeenCalledWith('2');
    });
});
