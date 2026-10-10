import { describe, expect, test } from 'vitest';
import {
    getPopoverPosition,
    getTabStops,
    isRectVisible,
    nextTabStop,
} from './tour';

const viewport = { width: 1200, height: 800 };
const popover = { width: 340, height: 180 };

describe('getPopoverPosition', () => {
    test('centers the popover without a target', () => {
        expect(getPopoverPosition(null, popover, viewport)).toEqual({
            top: 310,
            left: 430,
            placement: 'center',
        });
    });

    test('places it on the preferred side when it fits', () => {
        const target = { top: 100, left: 20, width: 200, height: 40 };

        const result = getPopoverPosition(target, popover, viewport, 'right');

        expect(result.placement).toBe('right');
        expect(result.left).toBe(20 + 200 + 14);
    });

    test('flips to the opposite side when the preferred one overflows', () => {
        const target = { top: 20, left: 500, width: 100, height: 30 };

        const result = getPopoverPosition(target, popover, viewport, 'top');

        expect(result.placement).toBe('bottom');
        expect(result.top).toBe(20 + 30 + 14);
    });

    test('falls back to below the target when neither horizontal side fits', () => {
        const narrow = { width: 360, height: 800 };
        const target = { top: 100, left: 12, width: 216, height: 32 };

        const result = getPopoverPosition(target, popover, narrow, 'right');

        expect(result.placement).toBe('bottom');
        expect(result.top).toBe(100 + 32 + 14);
    });

    test('keeps the popover inside the viewport', () => {
        const target = { top: 100, left: 1150, width: 40, height: 40 };

        const result = getPopoverPosition(target, popover, viewport, 'bottom');

        expect(result.left).toBeLessThanOrEqual(1200 - 340 - 12);
        expect(result.left).toBeGreaterThanOrEqual(12);
    });
});

describe('isRectVisible', () => {
    test.each([
        [{ top: 10, left: 10, width: 50, height: 20 }, true],
        [{ top: 10, left: 10, width: 0, height: 0 }, false],
        [{ top: 10, left: -300, width: 260, height: 20 }, false],
        [{ top: 900, left: 10, width: 50, height: 20 }, false],
    ])('%j -> %s', (rect, expected) => {
        expect(isRectVisible(rect, viewport)).toBe(expected);
    });
});

describe('tab stops', () => {
    const build = () => {
        document.body.innerHTML = `
            <div id="target"><input id="a" /><button id="b">b</button></div>
            <div id="popover"><button id="c">c</button><button id="d" disabled>d</button></div>
        `;

        return {
            target: document.getElementById('target')!,
            popover: document.getElementById('popover')!,
            byId: (id: string) => document.getElementById(id)!,
        };
    };

    test('collects the target then the popover, skipping disabled controls', () => {
        const { target, popover } = build();

        expect(getTabStops(target, popover).map((el) => el.id)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    test('includes the target itself when it is focusable', () => {
        const { byId, popover } = build();

        expect(getTabStops(byId('b'), popover).map((el) => el.id)).toEqual([
            'b',
            'c',
        ]);
    });

    test('moves forwards and backwards, wrapping at the ends', () => {
        const { target, popover, byId } = build();
        const stops = getTabStops(target, popover);

        expect(nextTabStop(stops, byId('a'), false)?.id).toBe('b');
        expect(nextTabStop(stops, byId('c'), false)?.id).toBe('a');
        expect(nextTabStop(stops, byId('a'), true)?.id).toBe('c');
    });

    test('pulls focus back in from outside the stops', () => {
        const { target, popover } = build();
        const stops = getTabStops(target, popover);
        const outside = document.createElement('button');

        expect(nextTabStop(stops, outside, false)?.id).toBe('a');
        expect(nextTabStop(stops, outside, true)?.id).toBe('c');
        expect(nextTabStop([], outside, false)).toBeNull();
    });
});
