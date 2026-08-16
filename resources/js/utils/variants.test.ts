import { describe, expect, test } from 'vitest';
import {
    boardCardVariants,
    listRowVariants,
    priorityTextColor,
} from './variants';

describe('priorityTextColor', () => {
    test('applies the base classes regardless of priority', () => {
        expect(priorityTextColor({ priority: 'high' })).toContain(
            'text-[11px] font-medium capitalize',
        );
    });

    test('returns the correct color for each priority', () => {
        expect(priorityTextColor({ priority: 'high' })).toContain(
            'text-[#f44336]',
        );
        expect(priorityTextColor({ priority: 'medium' })).toContain(
            'text-[#ff9800]',
        );
        expect(priorityTextColor({ priority: 'low' })).toContain(
            'text-[#4caf50]',
        );
    });
});

describe('boardCardVariants', () => {
    test('applies the base layout classes', () => {
        expect(
            boardCardVariants({ isActive: false, isClosed: false }),
        ).toContain('flex flex-col gap-2 rounded-xl border p-3');
    });

    test('applies active border/background classes when active', () => {
        const result = boardCardVariants({ isActive: true, isClosed: false });
        expect(result).toContain('border-[var(--border-color-strong)]');
        expect(result).toContain('bg-[var(--bg-light-color-hover)]');
    });

    test('applies inactive border/background classes when not active', () => {
        const result = boardCardVariants({ isActive: false, isClosed: false });
        expect(result).toContain('border-[var(--border-color)]');
        expect(result).toContain('bg-[var(--bg-light-color)]');
    });

    test('applies reduced opacity when closed', () => {
        expect(
            boardCardVariants({ isActive: false, isClosed: true }),
        ).toContain('opacity-50');
    });

    test('applies no extra opacity classes when not closed', () => {
        expect(
            boardCardVariants({ isActive: false, isClosed: false }),
        ).not.toContain('opacity-50');
    });
});

describe('listRowVariants', () => {
    test('applies the base row classes', () => {
        expect(listRowVariants({ isActive: false })).toContain(
            'group/row cursor-pointer',
        );
    });

    test('applies active background/text classes when active', () => {
        const result = listRowVariants({ isActive: true });
        expect(result).toContain('bg-[var(--bg-light-color-hover)]');
        expect(result).toContain('text-[var(--text-color)]');
    });

    test('applies inactive background/text classes when not active', () => {
        const result = listRowVariants({ isActive: false });
        expect(result).toContain('text-[var(--text-color)]');
        expect(result).toContain('bg-[var(--bg-color)]');
    });
});
