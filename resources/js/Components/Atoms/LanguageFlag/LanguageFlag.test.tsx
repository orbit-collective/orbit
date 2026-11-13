import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import LanguageFlag from './LanguageFlag';

describe('LanguageFlag', () => {
    test('is decorative', () => {
        const { container } = render(<LanguageFlag code="pl" />);

        expect(container.querySelector('svg')).toHaveAttribute(
            'aria-hidden',
            'true',
        );
    });

    test('draws a different flag per language', () => {
        const pl = render(<LanguageFlag code="pl" />).container.innerHTML;
        const en = render(<LanguageFlag code="en" />).container.innerHTML;
        const other = render(<LanguageFlag code="xx" />).container.innerHTML;

        expect(new Set([pl, en, other]).size).toBe(3);
    });

    test('merges a custom class', () => {
        const { container } = render(
            <LanguageFlag code="en" className="h-6 w-9" />,
        );

        expect(container.querySelector('svg')).toHaveClass('h-6', 'w-9');
    });
});
