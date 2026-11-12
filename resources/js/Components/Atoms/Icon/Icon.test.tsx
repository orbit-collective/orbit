import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Icon from './Icon';

describe('Icon Component', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('renders an svg for a valid icon name', () => {
        const { container } = render(<Icon name="Check" />);

        expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('still resolves an icon name that lucide has since renamed', () => {
        const { container } = render(<Icon name={'TriangleAlert' as never} />);

        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(console.warn).not.toHaveBeenCalled();
    });

    test('applies the size prop to the rendered svg', () => {
        const { container } = render(<Icon name="Check" size={32} />);

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '32');
        expect(svg).toHaveAttribute('height', '32');
    });

    test('forwards a className to the svg', () => {
        const { container } = render(
            <Icon name="Check" className="text-red-500" />,
        );

        expect(container.querySelector('svg')).toHaveClass('text-red-500');
    });

    test('renders an icon outside the bundled registry once the full set has loaded', async () => {
        const { container } = render(<Icon name="Anchor" size={20} />);

        // Until the chunk arrives the icon's box is reserved, without an svg.
        expect(container.querySelector('svg')).not.toBeInTheDocument();

        await waitFor(() =>
            expect(container.querySelector('svg')).toBeInTheDocument(),
        );
        expect(container.querySelector('svg')).toHaveAttribute('width', '20');
        expect(console.warn).not.toHaveBeenCalled();
    });

    test('renders a fallback icon and warns when the icon name is unknown', async () => {
        const warnSpy = vi.spyOn(console, 'warn');
        const { container } = render(<Icon name={'NotARealIcon' as any} />);

        await waitFor(() =>
            expect(container.querySelector('svg')).toBeInTheDocument(),
        );
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('NotARealIcon'),
        );
    });
});
