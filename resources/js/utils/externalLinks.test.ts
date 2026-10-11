import { describe, expect, test, vi } from 'vitest';
import { openExternal } from './externalLinks';

describe('openExternal', () => {
    test('opens a new tab without opener and severs window.opener', () => {
        const popup = { opener: window } as unknown as Window;
        const open = vi.spyOn(window, 'open').mockReturnValue(popup);

        openExternal('https://example.com');

        expect(open).toHaveBeenCalledWith(
            'https://example.com',
            '_blank',
            'noopener,noreferrer',
        );
        expect(popup.opener).toBeNull();
        open.mockRestore();
    });

    test('does not throw when the popup is blocked', () => {
        const open = vi.spyOn(window, 'open').mockReturnValue(null);

        expect(() => openExternal('https://example.com')).not.toThrow();
        open.mockRestore();
    });
});
