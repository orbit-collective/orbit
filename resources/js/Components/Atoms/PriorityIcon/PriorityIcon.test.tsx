import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PriorityIcon } from './PriorityIcon';

const high = { name: 'High', color: '#f44336', icon: 'SignalHigh' };

describe('PriorityIcon Component', () => {
    test('shows the priority name as the tooltip', () => {
        render(<PriorityIcon priority={high} />);

        expect(screen.getByText('High')).toBeInTheDocument();
    });

    test('names a priority the project made up itself', () => {
        render(
            <PriorityIcon
                priority={{ name: 'Blocker', color: '#9c27b0', icon: 'Flame' }}
            />,
        );

        expect(screen.getByText('Blocker')).toBeInTheDocument();
    });

    test('draws the icon in the priority color', () => {
        const { container } = render(<PriorityIcon priority={high} />);

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('stroke', '#f44336');
    });

    test('falls back to the flag icon for a name lucide does not know', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { container } = render(
            <PriorityIcon
                priority={{ name: 'Odd', color: '#111111', icon: 'NotAnIcon' }}
            />,
        );

        expect(container.querySelector('svg')).toHaveClass('lucide-flag');
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });

    test('renders "No priority" without a priority', () => {
        render(<PriorityIcon priority={null} />);

        expect(screen.getByText('No priority')).toBeInTheDocument();
    });

    test('renders "No priority" when none is given', () => {
        render(<PriorityIcon />);

        expect(screen.getByText('No priority')).toBeInTheDocument();
    });

    test('hides the tooltip when asked to', () => {
        render(<PriorityIcon priority={high} tooltip={false} />);

        expect(screen.queryByText('High')).not.toBeInTheDocument();
    });

    test('applies an additional className to the icon span', () => {
        render(<PriorityIcon priority={high} className="custom-class" />);

        expect(document.querySelector('span.custom-class')).toBeInTheDocument();
    });
});
