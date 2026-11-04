import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    useLiveChannel: vi.fn(),
    requestLiveReload: vi.fn(),
}));

vi.mock('./useLiveChannel', () => ({ useLiveChannel: mocks.useLiveChannel }));
vi.mock('./reloadQueue', () => ({
    requestLiveReload: mocks.requestLiveReload,
}));

import { useSettingsLive } from './useSettingsLive';

const handler = () =>
    mocks.useLiveChannel.mock.calls.at(-1)![1]['project.changed'];

describe('useSettingsLive', () => {
    beforeEach(() => {
        mocks.useLiveChannel.mockReset();
        mocks.requestLiveReload.mockReset();
    });

    test('listens on the selected project only', () => {
        renderHook(() => useSettingsLive(4));
        renderHook(() => useSettingsLive(null));

        expect(mocks.useLiveChannel.mock.calls[0][0]).toBe('project.4');
        expect(mocks.useLiveChannel.mock.calls[1][0]).toBeNull();
    });

    test.each([
        'members',
        'roles',
        'labels',
        'priorities',
        'issue-types',
        'project',
    ])('re-reads the page when %s change', (type) => {
        renderHook(() => useSettingsLive(4));

        handler()({
            changes: [{ type, id: null, action: 'updated' }],
            actor: 2,
        });

        expect(mocks.requestLiveReload).toHaveBeenCalledWith({});
    });

    test('ignores issue activity', () => {
        renderHook(() => useSettingsLive(4));

        handler()({
            changes: [{ type: 'issue', id: 1, action: 'updated' }],
            actor: 2,
        });

        expect(mocks.requestLiveReload).not.toHaveBeenCalled();
    });
});
