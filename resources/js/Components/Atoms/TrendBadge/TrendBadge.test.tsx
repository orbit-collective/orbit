import { render, screen } from '@testing-library/react';
import TrendBadge from './TrendBadge';

describe('TrendBadge', () => {
    test('shows a rise as good by default', () => {
        render(<TrendBadge value={2.456} />);

        expect(screen.getByText('2.46%')).toBeInTheDocument();
        expect(screen.getByText('2.46%').closest('span')).toHaveAttribute(
            'data-tone',
            'good',
        );
    });

    test('shows a fall as bad by default', () => {
        render(<TrendBadge value={-12} />);

        const badge = screen.getByText('12%').closest('span');
        expect(badge).toHaveAttribute('data-tone', 'bad');
    });

    test('can treat a rise as bad (errors going up)', () => {
        render(<TrendBadge value={5} positiveIsGood={false} />);

        expect(screen.getByText('5%').closest('span')).toHaveAttribute(
            'data-tone',
            'bad',
        );
    });

    test('no change is neutral-good', () => {
        render(<TrendBadge value={0} positiveIsGood={false} />);

        expect(screen.getByText('0%').closest('span')).toHaveAttribute(
            'data-tone',
            'good',
        );
    });
});
