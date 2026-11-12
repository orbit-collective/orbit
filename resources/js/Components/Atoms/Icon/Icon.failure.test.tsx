import { render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// The full-set loader caches its promise at module level, so each test gets
// its own copy of Icon and of the mocked lucide-react.
async function freshIcon() {
    vi.resetModules();

    return (await import('./Icon')).default;
}

describe('Icon when the full icon set cannot be downloaded', () => {
    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.doUnmock('lucide-react');
        vi.restoreAllMocks();
    });

    test('shows the fallback icon instead of an empty box', async () => {
        vi.doMock('lucide-react', () => {
            throw new Error('chunk failed to load');
        });
        const Icon = await freshIcon();

        const { container } = render(<Icon name="Anchor" />);

        await waitFor(() =>
            expect(container.querySelector('svg')).toBeInTheDocument(),
        );
    });

    test('tries the download again the next time such an icon is drawn', async () => {
        vi.doMock('lucide-react', () => {
            throw new Error('chunk failed to load');
        });
        const Icon = await freshIcon();
        const first = render(<Icon name="Anchor" />);
        await waitFor(() =>
            expect(first.container.querySelector('svg')).toBeInTheDocument(),
        );
        first.unmount();

        // Back online: the same name now loads for real.
        vi.doUnmock('lucide-react');
        vi.doMock('lucide-react', async (importOriginal) => importOriginal());
        const second = render(<Icon name="Anchor" size={20} />);

        await waitFor(() =>
            expect(second.container.querySelector('svg')).toHaveAttribute(
                'width',
                '20',
            ),
        );
        expect(
            second.container.querySelector('svg')?.getAttribute('class'),
        ).toContain('lucide-anchor');
    });
});
