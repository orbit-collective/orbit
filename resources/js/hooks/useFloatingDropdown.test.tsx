import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { useFloatingDropdown } from './useFloatingDropdown';

type Options = Parameters<typeof useFloatingDropdown>[0];

let latest: ReturnType<typeof useFloatingDropdown>;

const Harness = ({
    rect,
    ...options
}: Options & { rect: Partial<DOMRect> }) => {
    latest = useFloatingDropdown(options);

    return (
        <div
            ref={(element) => {
                latest.triggerRef.current = element;
                if (element) {
                    element.getBoundingClientRect = () =>
                        ({
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                            width: 0,
                            height: 0,
                            ...rect,
                        }) as DOMRect;
                }
            }}
        />
    );
};

const openWith = (rect: Partial<DOMRect>, options: Options = {}) => {
    render(<Harness rect={rect} {...options} />);
    act(() => latest.setIsOpen(true));

    return latest.position!;
};

describe('useFloatingDropdown positioning', () => {
    beforeEach(() => {
        Object.defineProperty(window, 'innerHeight', {
            value: 800,
            configurable: true,
        });
        Object.defineProperty(window, 'innerWidth', {
            value: 1200,
            configurable: true,
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    test('opens below the trigger when there is room', () => {
        const { side, style } = openWith({
            top: 100,
            bottom: 130,
            left: 50,
            right: 150,
            width: 100,
        });

        expect(side).toBe('bottom');
        expect(style.top).toBe(136);
        expect(style.left).toBe(50);
    });

    test('flips above the trigger when there is more room there', () => {
        const { side, style } = openWith({
            top: 700,
            bottom: 730,
            left: 50,
            right: 150,
            width: 100,
        });

        expect(side).toBe('top');
        expect(style.bottom).toBe(106);
        expect(style.top).toBeUndefined();
    });

    test('a top placement drops below when the top has no room', () => {
        const { side } = openWith(
            { top: 20, bottom: 50, left: 50, right: 150, width: 100 },
            { placement: 'top' },
        );

        expect(side).toBe('bottom');
    });

    test('aligns to the trigger end and stays inside the viewport', () => {
        const { style } = openWith(
            { top: 100, bottom: 130, left: 1100, right: 1190, width: 90 },
            { align: 'end', width: 224 },
        );

        // Aligning to the trigger end would reach 966; the viewport margin caps it.
        expect(style.left).toBe(1200 - 224 - 12);

        const clamped = openWith(
            { top: 100, bottom: 130, left: 1, right: 91, width: 90 },
            { align: 'end', width: 224 },
        );
        expect(clamped.style.left).toBe(12);
    });

    test('matches the trigger width, with a sensible minimum', () => {
        const { style } = openWith(
            { top: 100, bottom: 130, left: 50, right: 90, width: 40 },
            { width: 'trigger' },
        );

        expect(style.width).toBe(180);
    });

    test('anchors to a point instead of the trigger', () => {
        const { style } = openWith(
            { top: 500, bottom: 530, left: 900, right: 990, width: 90 },
            { anchorPoint: { x: 300, y: 200 } },
        );

        expect(style.left).toBe(300);
        expect(style.top).toBe(206);
    });

    test('closing clears the position', () => {
        openWith({ top: 100, bottom: 130, left: 50, right: 150, width: 100 });

        act(() => latest.setIsOpen(false));

        expect(latest.position).toBeNull();
    });

    test('closes when the trigger scrolls out of the window', () => {
        let rect: Partial<DOMRect> = {
            top: 100,
            bottom: 130,
            left: 50,
            right: 150,
            width: 100,
        };
        const { rerender } = render(<Harness rect={rect} />);
        act(() => latest.setIsOpen(true));
        expect(latest.isOpen).toBe(true);

        rect = { ...rect, top: -80, bottom: -50 };
        rerender(<Harness rect={rect} />);
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        expect(latest.isOpen).toBe(false);
    });

    test('keeps following the trigger while it is still in the window', () => {
        let rect: Partial<DOMRect> = {
            top: 100,
            bottom: 130,
            left: 50,
            right: 150,
            width: 100,
        };
        const { rerender } = render(<Harness rect={rect} />);
        act(() => latest.setIsOpen(true));

        rect = { ...rect, top: 300, bottom: 330 };
        rerender(<Harness rect={rect} />);
        act(() => {
            window.dispatchEvent(new Event('scroll'));
        });

        expect(latest.isOpen).toBe(true);
        expect(latest.position?.style.top).toBe(336);
    });

    test('never makes the panel taller than the window', () => {
        Object.defineProperty(window, 'innerHeight', {
            value: 120,
            configurable: true,
        });

        const { style } = openWith({
            top: 50,
            bottom: 70,
            left: 50,
            right: 150,
            width: 100,
        });

        // The 160px minimum would not fit in a 120px window.
        expect(style.maxHeight).toBe(120 - 2 * 12);
    });

    test('keeps the whole panel inside a short window instead of letting it run off the bottom', () => {
        Object.defineProperty(window, 'innerHeight', {
            value: 300,
            configurable: true,
        });

        // 112px are left below the trigger: less than a usable panel.
        const { style } = openWith({
            top: 120,
            bottom: 170,
            left: 50,
            right: 150,
            width: 100,
        });

        const top = style.top as number;
        const maxHeight = style.maxHeight as number;

        expect(maxHeight).toBe(160);
        expect(top + maxHeight).toBeLessThanOrEqual(300 - 12);
        expect(top).toBeGreaterThanOrEqual(12);
    });

    test('keeps the whole panel inside a short window when it opens upwards', () => {
        Object.defineProperty(window, 'innerHeight', {
            value: 300,
            configurable: true,
        });

        const { side, style } = openWith(
            { top: 130, bottom: 180, left: 50, right: 150, width: 100 },
            { placement: 'top' },
        );

        const bottom = style.bottom as number;
        const maxHeight = style.maxHeight as number;

        // 112px above, 102px below: it stays above, pulled down into the window.
        expect(side).toBe('top');
        expect(maxHeight).toBe(160);
        expect(300 - bottom - maxHeight).toBeGreaterThanOrEqual(12);
    });
});
