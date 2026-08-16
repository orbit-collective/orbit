import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import PasswordStrengthMeter from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
    test('renders nothing when the password is empty', () => {
        const { container } = render(<PasswordStrengthMeter password="" />);

        expect(container).toBeEmptyDOMElement();
    });

    test('shows the Weak label for a simple password', () => {
        render(<PasswordStrengthMeter password="abcdefg" />);

        expect(screen.getByText('Weak')).toBeInTheDocument();
    });

    test('shows the Strong label for a complex password', () => {
        render(<PasswordStrengthMeter password="Abcdefghijkl1!" />);

        expect(screen.getByText('Strong')).toBeInTheDocument();
    });
});
