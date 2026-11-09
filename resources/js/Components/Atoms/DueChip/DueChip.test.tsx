import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import DueChip from './DueChip';

const NOW = new Date(2026, 10, 10, 12, 0);

describe('DueChip', () => {
    test.each([
        ['2026-11-08', 'overdue', '2d overdue', '2 days overdue'],
        ['2026-11-10', 'today', 'Today', 'due today'],
        ['2026-11-11', 'soon', 'Tomorrow', 'due tomorrow'],
        ['2026-11-30', 'later', 'Nov 30', 'due in 20 days'],
    ])('%s is %s', (endDate, tone, label, spoken) => {
        render(<DueChip endDate={endDate} now={NOW} />);

        expect(screen.getByTestId('due-chip')).toHaveAttribute(
            'data-tone',
            tone,
        );
        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(spoken)).toBeInTheDocument();
    });

    test('hides the short label from assistive technology and speaks the sentence instead', () => {
        render(<DueChip endDate="2026-11-14" now={NOW} />);

        expect(screen.getByText('in 4d')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
        expect(screen.getByText('due in 4 days')).toHaveClass('sr-only');
    });

    test('has an icon, so the tone is not only a color', () => {
        const { container } = render(
            <DueChip endDate="2026-11-01" now={NOW} />,
        );

        expect(container.querySelector('svg')).not.toBeNull();
    });

    test('takes the extra classes it is given', () => {
        render(<DueChip endDate="2026-11-01" now={NOW} className="ml-2" />);

        expect(screen.getByTestId('due-chip')).toHaveClass('ml-2');
    });
});
