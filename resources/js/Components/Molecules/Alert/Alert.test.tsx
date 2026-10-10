import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AlertItem } from '@/types/Alert';
import { Alert } from './Alert';

describe('Alert Component', () => {
    const buildAlert = (overrides: Partial<AlertItem> = {}): AlertItem => ({
        id: '1',
        message: 'Something happened',
        type: 'success',
        ...overrides,
    });

    test('renders the alert message', () => {
        render(<Alert alert={buildAlert()} onClose={() => {}} />);

        expect(screen.getByText('Something happened')).toBeInTheDocument();
    });

    test('renders a close button', () => {
        render(<Alert alert={buildAlert()} onClose={() => {}} />);

        expect(
            screen.getByRole('button', { name: /close alert/i }),
        ).toBeInTheDocument();
    });

    test('calls onClose when the close button is clicked', async () => {
        const handleClose = vi.fn();
        render(<Alert alert={buildAlert()} onClose={handleClose} />);

        await userEvent.click(
            screen.getByRole('button', { name: /close alert/i }),
        );

        expect(handleClose).toHaveBeenCalledTimes(1);
    });

    test.each([
        ['success', 'text-[var(--success-color)]'],
        ['error', 'text-[var(--error-color)]'],
        ['warning', 'text-[var(--warning-color)]'],
        ['information', 'text-[var(--info-color)]'],
    ] as const)(
        'renders an icon styled for the %s intent',
        (type, colorClass) => {
            const { container } = render(
                <Alert alert={buildAlert({ type })} onClose={() => {}} />,
            );

            expect(container.querySelector('svg')).toHaveClass(colorClass);
        },
    );

    test('falls back to the information styling for an unknown type', () => {
        const { container } = render(
            <Alert
                alert={buildAlert({ type: 'unknown' as AlertItem['type'] })}
                onClose={() => {}}
            />,
        );

        expect(container.querySelector('svg')).toHaveClass(
            'text-[var(--info-color)]',
        );
    });

    test('renders a "View details" link when actionUrl is provided', () => {
        render(
            <Alert
                alert={buildAlert({ actionUrl: '/issues/1' })}
                onClose={() => {}}
            />,
        );

        expect(
            screen.getByRole('link', { name: 'View details' }),
        ).toHaveAttribute('href', '/issues/1');
    });

    test('does not render a "View details" link when actionUrl is missing', () => {
        render(<Alert alert={buildAlert()} onClose={() => {}} />);

        expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
});
