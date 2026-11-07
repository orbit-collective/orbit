import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Skeleton from './Skeleton';

describe('Skeleton', () => {
    test('is a decorative block that takes the classes it is given', () => {
        render(<Skeleton className="h-4 w-20" />);

        const block = screen.getByTestId('skeleton');
        expect(block).toHaveClass('h-4', 'w-20');
        expect(block).toHaveAttribute('aria-hidden', 'true');
    });
});
