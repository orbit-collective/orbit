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

    test('colours follow the theme variables, not hardcoded hex', () => {
        const { rerender } = render(<TrendBadge value={1} />);
        const good = screen.getByText('1%').closest('span')!.className;
        expect(good).toContain('var(--success-color)');
        expect(good).not.toMatch(/#[0-9a-fA-F]{6}/);

        rerender(<TrendBadge value={-1} />);
        const bad = screen.getByText('1%').closest('span')!.className;
        expect(bad).toContain('var(--error-color)');
        expect(bad).not.toMatch(/#[0-9a-fA-F]{6}/);
    });
});
