import { AlertProvider } from '@/context/AlertContext';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import AccountSettingsProfileTab from './AccountSettingsProfileTab';

interface RouterPostOptions {
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
    onFinish?: () => void;
}

const { mockRouterPost } = vi.hoisted(() => ({
    mockRouterPost: vi.fn(),
}));

vi.mock('@inertiajs/react', () => ({
    usePage: () => ({ props: { flash: {} } }),
    router: { post: mockRouterPost },
    useForm: (initial: Record<string, string>) => ({
        data: initial,
        setData: vi.fn(),
        post: vi.fn(),
        errors: {},
        processing: false,
        clearErrors: vi.fn(),
    }),
}));

vi.mock('@/utils/faces', () => ({
    rasterizeImage: vi.fn().mockResolvedValue({
        toDataURL: () => 'data:image/png;base64,FACE',
    }),
    canvasToBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
    canvasesMatch: vi.fn().mockReturnValue(false),
}));

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

const openLibraryAndPickFace = async () => {
    const user = userEvent.setup();
    render(
        <AlertProvider>
            <AccountSettingsProfileTab
                userName="John Doe"
                userAvatar="/storage/avatars/old.png"
            />
        </AlertProvider>,
    );

    await user.click(
        screen.getByRole('button', { name: /choose from library/i }),
    );
    const [face] = screen.getAllByRole('button', { name: /^Use .* avatar$/ });
    await user.click(face);

    await waitFor(() => expect(mockRouterPost).toHaveBeenCalled());

    return mockRouterPost.mock.calls[0][2] as RouterPostOptions;
};

describe('AccountSettingsProfileTab avatar library', () => {
    test('restores the previous avatar when saving a face fails', async () => {
        const options = await openLibraryAndPickFace();

        expect(screen.getAllByAltText('Avatar preview')[0]).toHaveAttribute(
            'src',
            'data:image/png;base64,FACE',
        );

        options.onError?.({});
        options.onFinish?.();

        await waitFor(() =>
            expect(screen.getAllByAltText('Avatar preview')[0]).toHaveAttribute(
                'src',
                '/storage/avatars/old.png',
            ),
        );
        expect(
            await screen.findByText('Failed to update avatar.'),
        ).toBeInTheDocument();
    });

    test('disables the upload controls while a face is saving', async () => {
        await openLibraryAndPickFace();

        expect(screen.getByText('Saving...')).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /upload new photo/i }),
        ).not.toBeInTheDocument();
    });
});
