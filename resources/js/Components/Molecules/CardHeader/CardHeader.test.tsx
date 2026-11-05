import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import CardHeader from './CardHeader';

describe('CardHeader', () => {
    test('is plain, with no button, until a toggle is provided', () => {
        render(<CardHeader icon="Bug" title="Errors" description="The log" />);

        expect(screen.getByText('Errors')).toBeInTheDocument();
        expect(screen.getByText('The log')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    test('becomes a toggle reporting its state', () => {
        const toggle = vi.fn();
        const { rerender } = render(
            <CardHeader
                icon="Bug"
                title="Errors"
                onToggleCollapse={toggle}
                controls="body"
            />,
        );

        const button = screen.getByRole('button', { name: /Errors/ });
        expect(button).toHaveAttribute('aria-expanded', 'true');
        expect(button).toHaveAttribute('aria-controls', 'body');

        fireEvent.click(button);
        expect(toggle).toHaveBeenCalledTimes(1);

        rerender(
            <CardHeader
                icon="Bug"
                title="Errors"
                onToggleCollapse={toggle}
                collapsed
            />,
        );
        expect(screen.getByRole('button')).toHaveAttribute(
            'aria-expanded',
            'false',
        );
    });

    test('shows the summary and hides the description only while collapsed', () => {
        const props = {
            icon: 'Bug' as const,
            title: 'Errors',
            description: 'The log',
            collapsedSummary: '12 errors',
            onToggleCollapse: vi.fn(),
        };
        const { rerender } = render(<CardHeader {...props} />);

        expect(screen.getByText('The log')).toBeInTheDocument();
        expect(
            screen.queryByTestId('collapsed-summary'),
        ).not.toBeInTheDocument();

        rerender(<CardHeader {...props} collapsed />);

        expect(screen.queryByText('The log')).not.toBeInTheDocument();
        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            '12 errors',
        );
    });

    test('a summary without a toggle is never shown', () => {
        render(
            <CardHeader
                icon="Bug"
                title="Errors"
                collapsed
                collapsedSummary="x"
            />,
        );

        expect(screen.getByTestId('collapsed-summary')).toBeInTheDocument();
    });

    test('works without an icon: no icon box and the description is not indented', () => {
        render(<CardHeader title="Plain" description="No icon here" />);

        expect(
            screen.getByRole('heading', { name: 'Plain' }).querySelector('svg'),
        ).toBeNull();
        expect(screen.getByText('No icon here')).not.toHaveClass('pl-11');
    });
});
