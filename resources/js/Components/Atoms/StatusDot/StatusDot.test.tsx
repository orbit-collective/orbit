import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import StatusDot from './StatusDot';

describe('StatusDot Component', () => {
    test('renders a span element', () => {
        const { container } = render(<StatusDot status="todo" />);

        expect(container.querySelector('span')).toBeInTheDocument();
    });

    test('applies the small size classes by default', () => {
        const { container } = render(<StatusDot status="todo" />);

        expect(container.firstChild).toHaveClass('w-2', 'h-2');
    });

    test('applies the medium size classes when size is md', () => {
        const { container } = render(<StatusDot status="todo" size="md" />);

        expect(container.firstChild).toHaveClass('w-2.5', 'h-2.5');
    });

    test.each([
        ['todo', 'bg-[var(--info-color)]'],
        ['in_progress', 'bg-[var(--accent-color)]'],
        ['done', 'bg-[var(--pending-color)]'],
        ['low', 'bg-[var(--success-color)]'],
        ['medium', 'bg-[var(--warning-color)]'],
        ['high', 'bg-[var(--error-color)]'],
    ] as const)('applies the correct color for status "%s"', (status, cls) => {
        const { container } = render(<StatusDot status={status} />);

        expect(container.firstChild).toHaveClass(cls);
    });

    test('merges an additional className', () => {
        const { container } = render(
            <StatusDot status="todo" className="ml-2" />,
        );

        expect(container.firstChild).toHaveClass('ml-2', 'inline-block');
    });

    test("paints an explicit color, e.g. a priority's own", () => {
        const { container } = render(<StatusDot color="#9c27b0" />);

        expect(container.firstChild).toHaveStyle({
            backgroundColor: '#9c27b0',
        });
    });

    test('draws no inline color without one', () => {
        const { container } = render(<StatusDot status="todo" />);

        expect(container.firstChild).not.toHaveAttribute('style');
    });
});
