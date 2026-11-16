import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import LanguageBar from './LanguageBar';

const shares = [
    { name: 'TypeScript', percent: 60, color: '#3178c6' },
    { name: 'PHP', percent: 40, color: '#4f5d95' },
];

describe('LanguageBar', () => {
    test('draws one segment per language, sized by its share', () => {
        render(<LanguageBar shares={shares} />);

        const segments = screen.getAllByTestId('language-segment');
        expect(segments).toHaveLength(2);
        expect(segments[0]).toHaveStyle({
            width: '60%',
            backgroundColor: '#3178c6',
        });
    });

    test('carries every number in the legend, and hides the picture from assistive technology', () => {
        const { container } = render(<LanguageBar shares={shares} />);

        expect(screen.getByText('TypeScript')).toBeInTheDocument();
        expect(screen.getByText('60%')).toBeInTheDocument();
        expect(screen.getByText('40%')).toBeInTheDocument();
        expect(
            container.querySelector('[aria-hidden="true"]'),
        ).toContainElement(screen.getAllByTestId('language-segment')[0]);
    });
});
