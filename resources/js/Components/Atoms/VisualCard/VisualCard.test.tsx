import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { VisualCard } from './VisualCard';

describe('VisualCard Component', () => {
    test('renders its children', () => {
        render(
            <VisualCard>
                <span>Card content</span>
            </VisualCard>,
        );

        expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    test('applies the base card styling', () => {
        render(
            <VisualCard>
                <span>Card content</span>
            </VisualCard>,
        );

        expect(screen.getByText('Card content').parentElement).toHaveClass(
            'rounded-lg',
            'border-[var(--border-color)]',
            'bg-[var(--surface-color)]',
        );
    });

    test('merges a custom className with the base styling', () => {
        render(
            <VisualCard className="custom-card">
                <span>Card content</span>
            </VisualCard>,
        );

        expect(screen.getByText('Card content').parentElement).toHaveClass(
            'custom-card',
            'rounded-lg',
        );
    });
});
