import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import {
    DEFAULT_SETTINGS,
    SETTINGS_STORAGE_KEY,
} from '@/utils/developmentSettings';
import { useDevelopmentSettings } from './useDevelopmentSettings';

describe('useDevelopmentSettings', () => {
    test('starts from the defaults', () => {
        const { result } = renderHook(() => useDevelopmentSettings());

        expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    test('starts from what was remembered', () => {
        localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify({ range: '7d' }),
        );
        const { result } = renderHook(() => useDevelopmentSettings());

        expect(result.current.settings.range).toBe('7d');
    });

    test('ignores a stored value that is not JSON', () => {
        localStorage.setItem(SETTINGS_STORAGE_KEY, '{oops');
        const { result } = renderHook(() => useDevelopmentSettings());

        expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    test('updates some settings, keeps the rest, and remembers them', () => {
        const { result } = renderHook(() => useDevelopmentSettings());

        act(() =>
            result.current.update({ range: '30d', pullRequestsPerPage: 25 }),
        );

        expect(result.current.settings).toMatchObject({
            range: '30d',
            pullRequestsPerPage: 25,
            commitsShown: 8,
        });
        expect(
            JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)!),
        ).toMatchObject({ range: '30d' });
    });

    test('refuses a value that is not allowed', () => {
        const { result } = renderHook(() => useDevelopmentSettings());

        act(() => result.current.update({ range: 'forever' as never }));

        expect(result.current.settings.range).toBe(DEFAULT_SETTINGS.range);
    });

    test('resets to the defaults', () => {
        const { result } = renderHook(() => useDevelopmentSettings());
        act(() => result.current.update({ range: '7d' }));

        act(() => result.current.reset());

        expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    });

    test('still applies settings when storage is blocked', () => {
        const { result } = renderHook(() => useDevelopmentSettings());
        (
            localStorage.setItem as unknown as {
                mockImplementationOnce: (f: () => never) => void;
            }
        ).mockImplementationOnce(() => {
            throw new Error('blocked');
        });

        act(() => result.current.update({ range: '7d' }));

        expect(result.current.settings.range).toBe('7d');
    });
});
