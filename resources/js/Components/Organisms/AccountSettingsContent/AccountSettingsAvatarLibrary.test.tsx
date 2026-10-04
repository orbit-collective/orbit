import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsAvatarLibrary from './AccountSettingsAvatarLibrary';

const { mockRasterizeImage, mockCanvasesMatch } = vi.hoisted(() => ({
    mockRasterizeImage: vi.fn(),
    mockCanvasesMatch: vi.fn(),
}));

vi.mock('@/utils/faces', () => ({
    rasterizeImage: mockRasterizeImage,
    canvasesMatch: mockCanvasesMatch,
}));

describe('AccountSettingsAvatarLibrary', () => {
    test('marks the face matching the current avatar as selected', async () => {
        mockRasterizeImage.mockResolvedValue({});
        mockCanvasesMatch.mockReturnValue(true);

        render(
            <AccountSettingsAvatarLibrary
                avatarSrc="/storage/avatars/a.png"
                onSelect={() => {}}
            />,
        );

        await waitFor(() =>
            expect(
                screen.getAllByRole('button', { pressed: true }),
            ).toHaveLength(1),
        );
    });

    test('retries matching after a face failed to load once', async () => {
        // The face cache is module-level, so start from a fresh module.
        vi.resetModules();
        const { default: FreshLibrary } =
            await import('./AccountSettingsAvatarLibrary');

        // The avatar loads, but the faces fail (e.g. a network blip).
        mockRasterizeImage.mockImplementation((src: string) =>
            src.startsWith('/storage/')
                ? Promise.resolve({})
                : Promise.reject(new Error('network')),
        );
        mockCanvasesMatch.mockReturnValue(true);

        const first = render(
            <FreshLibrary
                avatarSrc="/storage/avatars/b.png"
                onSelect={() => {}}
            />,
        );
        await waitFor(() =>
            expect(mockRasterizeImage.mock.calls.length).toBeGreaterThan(1),
        );
        first.unmount();

        mockRasterizeImage.mockResolvedValue({});

        render(
            <FreshLibrary
                avatarSrc="/storage/avatars/b.png"
                onSelect={() => {}}
            />,
        );

        await waitFor(() =>
            expect(
                screen.getAllByRole('button', { pressed: true }),
            ).toHaveLength(1),
        );
    });

    test('still finds the matching face when an earlier face fails to load', async () => {
        vi.resetModules();
        const { default: FreshLibrary } =
            await import('./AccountSettingsAvatarLibrary');

        let faceCalls = 0;
        mockRasterizeImage.mockImplementation((src: string) => {
            if (src.startsWith('/storage/')) {
                return Promise.resolve({});
            }

            faceCalls += 1;

            return faceCalls === 1
                ? Promise.reject(new Error('network'))
                : Promise.resolve({});
        });
        mockCanvasesMatch.mockReturnValue(true);

        render(
            <FreshLibrary
                avatarSrc="/storage/avatars/c.png"
                onSelect={() => {}}
            />,
        );

        const pressed = await screen.findAllByRole('button', {
            pressed: true,
        });
        expect(pressed).toHaveLength(1);
        expect(pressed[0]).not.toBe(
            screen.getAllByRole('button', { name: /^Use .* avatar$/ })[0],
        );
    });
});
