import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Divider from './Divider';

describe('Divider Component', () => {
    test('renders a plain horizontal rule when no label is given', () => {
        const { container } = render(<Divider />);

        expect(container.querySelector('hr')).toBeInTheDocument();
        expect(screen.queryByText(/./)).not.toBeInTheDocument();
    });

    test('renders the label between two lines when given', () => {
        render(<Divider label="Or continue with" />);

        expect(screen.getByText('Or continue with')).toBeInTheDocument();
    });

    test('merges custom className', () => {
        const { container } = render(<Divider className="my-4" />);

        expect(container.querySelector('hr')).toHaveClass('my-4');
    });

    test('renders a vertical separator', () => {
        render(<Divider orientation="vertical" />);

        expect(screen.getByRole('separator')).toHaveAttribute(
            'aria-orientation',
            'vertical',
        );
    });
});
