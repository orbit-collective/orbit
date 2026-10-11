import { describe, expect, test, vi } from 'vitest';
import {
    OPEN_COMMAND_PALETTE_EVENT,
    requestOpenCommandPalette,
} from './commandPaletteEvent';

describe('requestOpenCommandPalette', () => {
    test('dispatches the open event on window', () => {
        const listener = vi.fn();
        window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, listener);

        requestOpenCommandPalette();

        expect(listener).toHaveBeenCalledTimes(1);
        window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, listener);
    });

    test('is a no-op when nothing is listening', () => {
        expect(() => requestOpenCommandPalette()).not.toThrow();
    });
});
