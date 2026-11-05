import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
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
    // The library unfolds with an animation: wait for it to be reachable.
    const [face] = await screen.findAllByRole('button', {
        name: /^Use .* avatar$/,
    });
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

    test('the library unfolds on request and folds away again', async () => {
        const user = userEvent.setup();
        render(
            <AlertProvider>
                <AccountSettingsProfileTab
                    userName="John Doe"
                    userAvatar="/storage/avatars/old.png"
                />
            </AlertProvider>,
        );
        expect(screen.queryByText('Avatar library')).not.toBeInTheDocument();

        const toggle = screen.getByRole('button', {
            name: /choose from library/i,
        });
        await user.click(toggle);
        expect(await screen.findByText('Avatar library')).toBeInTheDocument();

        await user.click(
            screen.getByRole('button', {
                name: /choose from library|hide library|close/i,
            }),
        );
        await waitFor(() =>
            expect(
                screen.queryByText('Avatar library'),
            ).not.toBeInTheDocument(),
        );
    });
});

describe('AccountSettingsProfileTab panels', () => {
    test('the profile and preview panels fold, the profile one summarising the name', () => {
        render(
            inSettingsPage(
                <AlertProvider>
                    <AccountSettingsProfileTab
                        userName="John Doe"
                        userAvatar={null}
                    />
                </AlertProvider>,
                'profile',
            ),
        );

        expectPanelsToFold([/^Profile/, /Live preview/]);
        fireEvent.click(screen.getByRole('button', { name: /^Profile/ }));
        expect(screen.getAllByTestId('collapsed-summary')[0]).toHaveTextContent(
            'John Doe',
        );
    });
});

describe('AccountSettingsProfileTab save state', () => {
    test('says "Changes saved" while nothing is edited, visibly, with no entrance replay', async () => {
        render(
            <AlertProvider>
                <AccountSettingsProfileTab
                    userName="John Doe"
                    userAvatar={null}
                />
            </AlertProvider>,
        );

        await waitFor(() =>
            expect(screen.getByText('Changes saved')).toBeVisible(),
        );
        expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
});
