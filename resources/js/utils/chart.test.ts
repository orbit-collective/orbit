import { describe, expect, test } from 'vitest';
import { smoothLinePath } from './chart';

/** Every `C` of the path as its six numbers. */
const curves = (path: string) =>
    [...path.matchAll(/C([^C]+)/g)].map((match) =>
        match[1].trim().split(/[ ,]+/).map(Number),
    );

describe('smoothLinePath', () => {
    test('is empty without points and a single move for one', () => {
        expect(smoothLinePath([])).toBe('');
        expect(smoothLinePath([{ x: 5, y: 7 }])).toBe('M5,7');
    });

    test('starts at the first point and ends at the last', () => {
        const path = smoothLinePath([
            { x: 0, y: 100 },
            { x: 50, y: 20 },
            { x: 100, y: 60 },
        ]);

        expect(path.startsWith('M0,100')).toBe(true);
        expect(path.endsWith('100,60')).toBe(true);
        expect(curves(path)).toHaveLength(2);
    });

    test('never leaves the band between the points it joins', () => {
        // A spike in the middle and flat ends.
        const points = [
            { x: 0, y: 100 },
            { x: 25, y: 100 },
            { x: 50, y: 10 },
            { x: 75, y: 100 },
            { x: 100, y: 100 },
        ];

        for (const curve of curves(smoothLinePath(points))) {
            const [, c1y, , c2y] = curve;

            expect(c1y).toBeGreaterThanOrEqual(10);
            expect(c1y).toBeLessThanOrEqual(100);
            expect(c2y).toBeGreaterThanOrEqual(10);
            expect(c2y).toBeLessThanOrEqual(100);
        }
    });

    test('is flat where the data is flat', () => {
        const flat = curves(
            smoothLinePath([
                { x: 0, y: 40 },
                { x: 50, y: 40 },
                { x: 100, y: 40 },
            ]),
        );

        for (const [, c1y, , c2y, , y] of flat) {
            expect([c1y, c2y, y]).toEqual([40, 40, 40]);
        }
    });

    test('limits a steep step so it does not overshoot', () => {
        const [curve] = curves(
            smoothLinePath([
                { x: 0, y: 0 },
                { x: 1, y: 1000 },
                { x: 2, y: 1001 },
            ]),
        );

        expect(curve[3]).toBeLessThanOrEqual(1000.0001);
    });

    test('copes with points at the same x', () => {
        expect(() =>
            smoothLinePath([
                { x: 0, y: 1 },
                { x: 0, y: 2 },
            ]),
        ).not.toThrow();
    });
});
