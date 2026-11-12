import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

const imports = vi.hoisted(() => ({ echo: vi.fn() }));

vi.mock('laravel-echo', () => {
    imports.echo();

    return { default: class Echo {} };
});
vi.mock('pusher-js', () => ({ default: class Pusher {} }));

import { echoLibraries, loadEchoLibraries, useEchoReady } from './echoLoader';

describe('echoLoader', () => {
    test('does not download anything while live updates are off', async () => {
        const { result } = renderHook(() => useEchoReady(false));

        await act(async () => {});

        expect(result.current).toBe(false);
        expect(imports.echo).not.toHaveBeenCalled();
        expect(() => echoLibraries()).toThrow('not been loaded');
    });

    test('loads the libraries once live updates are on and reports ready', async () => {
        const { result } = renderHook(() => useEchoReady(true));

        expect(result.current).toBe(false);
        await waitFor(() => expect(result.current).toBe(true));

        expect(echoLibraries().Echo).toBeDefined();
        expect(echoLibraries().Pusher).toBeDefined();
    });

    test('loads only once however often it is asked', async () => {
        const first = loadEchoLibraries();

        expect(loadEchoLibraries()).toBe(first);
        await first;
    });
});
