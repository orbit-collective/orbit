import { render, waitFor } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import ProgressRing from './ProgressRing';

describe('ProgressRing Component', () => {
    test('sizes the svg to twice the radius', () => {
        const { container } = render(
            <ProgressRing radius={20} progress={50} />,
        );

        const svg = container.querySelector('svg');
        expect(svg).toHaveAttribute('width', '40');
        expect(svg).toHaveAttribute('height', '40');
    });

    test('renders a background circle and a progress circle', () => {
        const { container } = render(
            <ProgressRing radius={18} progress={50} />,
        );

        expect(container.querySelectorAll('circle')).toHaveLength(2);
    });

    test('computes a zero stroke offset for 100% progress (a full ring)', async () => {
        const { container } = render(
            <ProgressRing radius={18} stroke={3} progress={100} />,
        );

        const progressCircle = container.querySelectorAll('circle')[1];
        await waitFor(() =>
            expect(progressCircle.getAttribute('stroke-dashoffset')).toBe('0'),
        );
    });

    test('computes the full circumference as the offset for 0% progress (an empty ring)', async () => {
        const radius = 18;
        const stroke = 3;
        const normalizedRadius = radius - stroke * 2;
        const circumference = normalizedRadius * 2 * Math.PI;

        const { container } = render(
            <ProgressRing radius={radius} stroke={stroke} progress={0} />,
        );

        const progressCircle = container.querySelectorAll('circle')[1];
        expect(
            Number(progressCircle.getAttribute('stroke-dashoffset')),
        ).toBeCloseTo(circumference, 5);
    });

    test('applies custom color classes to the circles', () => {
        const { container } = render(
            <ProgressRing
                radius={18}
                progress={50}
                colorClass="stroke-red-500"
                bgColorClass="stroke-zinc-800"
            />,
        );

        const [bgCircle, progressCircle] = container.querySelectorAll('circle');
        expect(bgCircle).toHaveClass('stroke-zinc-800');
        expect(progressCircle).toHaveClass('stroke-red-500');
    });

    test('draws itself from empty to its value and sweeps to a new one', async () => {
        const radius = 18;
        const stroke = 3;
        const circumference = (radius - stroke * 2) * 2 * Math.PI;
        const { container, rerender } = render(
            <ProgressRing radius={radius} stroke={stroke} progress={50} />,
        );
        const arc = () =>
            container.querySelector(
                '[data-testid="progress-arc"]',
            ) as SVGElement;

        await waitFor(() =>
            expect(Number(arc().getAttribute('stroke-dashoffset'))).toBeCloseTo(
                circumference / 2,
                3,
            ),
        );

        rerender(
            <ProgressRing radius={radius} stroke={stroke} progress={100} />,
        );

        await waitFor(() =>
            expect(arc().getAttribute('stroke-dashoffset')).toBe('0'),
        );
        expect(arc()).toHaveAttribute('data-progress', '100');
    });
});
