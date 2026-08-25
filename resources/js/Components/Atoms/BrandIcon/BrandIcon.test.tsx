import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import BrandIcon, { BrandIconName } from './BrandIcon';

const names: BrandIconName[] = [
    'discord',
    'slack',
    'github',
    'google-drive',
    'google-calendar',
];

describe('BrandIcon', () => {
    test.each(names)('renders an svg for "%s"', (name) => {
        const { container } = render(<BrandIcon name={name} />);

        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('applies the given className to the svg', () => {
        const { container } = render(
            <BrandIcon name="discord" className="h-8 w-8" />,
        );

        expect(container.querySelector('svg')).toHaveClass('h-8', 'w-8');
    });
});
