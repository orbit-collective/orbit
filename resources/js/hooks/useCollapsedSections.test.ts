import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useCollapsedSections } from './useCollapsedSections';

const KEY = 'test-sections';
const defaults = { a: false, b: true };

beforeEach(() => {
    localStorage.clear();
});

describe('useCollapsedSections', () => {
    test('starts from the defaults', () => {
        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );

        expect(result.current.collapse('a').collapsed).toBe(false);
        expect(result.current.collapse('b').collapsed).toBe(true);
        expect(result.current.collapse('unknown').collapsed).toBe(false);
    });

    test('a stored choice wins over the default', () => {
        localStorage.setItem(KEY, JSON.stringify({ a: true, b: false }));

        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );

        expect(result.current.collapse('a').collapsed).toBe(true);
        expect(result.current.collapse('b').collapsed).toBe(false);
    });

    test('toggling flips one section and remembers it', () => {
        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );

        act(() => result.current.collapse('a').onToggleCollapse?.());

        expect(result.current.collapse('a').collapsed).toBe(true);
        expect(result.current.collapse('b').collapsed).toBe(true);
        expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
            a: true,
            b: true,
        });
    });

    test('passes the summary through', () => {
        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );

        expect(result.current.collapse('a', '12 errors').collapsedSummary).toBe(
            '12 errors',
        );
    });

    test('collapse all and expand all, with the flags that drive the button', () => {
        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );
        expect(result.current.allCollapsed).toBe(false);
        expect(result.current.anyCollapsed).toBe(true);

        act(() => result.current.setAll(true));
        expect(result.current.allCollapsed).toBe(true);

        act(() => result.current.setAll(false));
        expect(result.current.allCollapsed).toBe(false);
        expect(result.current.anyCollapsed).toBe(false);
    });

    test('broken or hostile storage falls back to the defaults', () => {
        localStorage.setItem(KEY, '{not json');
        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );
        expect(result.current.collapse('b').collapsed).toBe(true);

        localStorage.setItem(KEY, '"a string"');
        const again = renderHook(() => useCollapsedSections(KEY, defaults));
        expect(again.result.current.collapse('b').collapsed).toBe(true);
    });

    test('still works when storage throws', () => {
        const get = vi
            .spyOn(Storage.prototype, 'getItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });
        const set = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new Error('blocked');
            });

        const { result } = renderHook(() =>
            useCollapsedSections(KEY, defaults),
        );
        act(() => result.current.collapse('a').onToggleCollapse?.());

        expect(result.current.collapse('a').collapsed).toBe(true);
        get.mockRestore();
        set.mockRestore();
    });
});
