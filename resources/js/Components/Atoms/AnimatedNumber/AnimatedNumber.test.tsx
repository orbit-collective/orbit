import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import AnimatedNumber from './AnimatedNumber';

describe('AnimatedNumber', () => {
    test('shows the value (animations are off under test)', () => {
        render(<AnimatedNumber value={1234} />);

        expect(screen.getByText((1234).toLocaleString())).toBeInTheDocument();
    });

    test('follows a new value', async () => {
        const { rerender } = render(<AnimatedNumber value={12} />);

        rerender(<AnimatedNumber value={14} />);

        expect(await screen.findByText('14')).toBeInTheDocument();
    });

    test('rounds fractions and takes a custom format', () => {
        render(
            <AnimatedNumber
                value={7.6}
                format={(n) => `${n.toFixed(1)}%`}
                className="big"
            />,
        );

        expect(screen.getByText('7.6%')).toHaveClass('big');
    });
});
