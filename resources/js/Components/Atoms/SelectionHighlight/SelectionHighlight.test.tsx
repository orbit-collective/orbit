import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import SelectionHighlight from './SelectionHighlight';

describe('SelectionHighlight', () => {
    test('is a decorative accent frame that never takes the pointer', () => {
        render(<SelectionHighlight />);

        const frame = screen.getByTestId('selection-highlight');
        expect(frame).toHaveAttribute('aria-hidden', 'true');
        expect(frame.className).toContain('pointer-events-none');
        expect(frame.className).toContain('border-[var(--accent-color)]');
    });

    test('takes extra classes', () => {
        render(<SelectionHighlight className="rounded-2xl" />);

        expect(screen.getByTestId('selection-highlight')).toHaveClass(
            'rounded-2xl',
        );
    });

    test('moves between cards when they share a layoutId', () => {
        const Group = ({ selected }: { selected: 'a' | 'b' }) => (
            <div>
                <div className="relative">
                    {selected === 'a' && (
                        <SelectionHighlight layoutId="group" />
                    )}
                </div>
                <div className="relative">
                    {selected === 'b' && (
                        <SelectionHighlight layoutId="group" />
                    )}
                </div>
            </div>
        );
        const { rerender } = render(<Group selected="a" />);
        expect(screen.getAllByTestId('selection-highlight')).toHaveLength(1);

        rerender(<Group selected="b" />);

        expect(screen.getAllByTestId('selection-highlight')).toHaveLength(1);
    });
});
