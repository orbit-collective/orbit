import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockAxios = vi.hoisted(() => ({
    post: vi.fn(),
    isAxiosError: vi.fn(() => true),
}));

vi.mock('axios', () => ({ default: mockAxios }));

const mockAddAlert = vi.hoisted(() => vi.fn());

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: mockAddAlert }),
}));

import { useImageUpload } from './useImageUpload';

beforeEach(() => {
    globalThis.route = vi.fn(
        (name: string, params: unknown) => `/${name}/${params}`,
    ) as unknown as typeof globalThis.route;
});

const file = new File(['x'], 'shot.png', { type: 'image/png' });

describe('useImageUpload', () => {
    test('posts the file to the project attachment endpoint and returns the URL', async () => {
        mockAxios.post.mockResolvedValue({ data: { url: '/storage/a.png' } });

        const { result } = renderHook(() => useImageUpload(7));

        await expect(result.current.uploadImage(file)).resolves.toBe(
            '/storage/a.png',
        );

        const [url, formData] = mockAxios.post.mock.calls[0];
        expect(url).toBe('/projects.attachments.store/7');
        expect((formData as FormData).get('file')).toBe(file);
        expect(mockAddAlert).not.toHaveBeenCalled();
    });

    test('flags the upload as in flight while it is running', async () => {
        let resolvePost: (value: unknown) => void = () => {};
        mockAxios.post.mockImplementation(
            () => new Promise((resolve) => (resolvePost = resolve)),
        );

        const { result } = renderHook(() => useImageUpload(7));

        let pending: Promise<string>;
        act(() => {
            pending = result.current.uploadImage(file);
        });

        await waitFor(() => expect(result.current.isUploading).toBe(true));

        await act(async () => {
            resolvePost({ data: { url: '/storage/a.png' } });
            await pending;
        });

        expect(result.current.isUploading).toBe(false);
    });

    test('surfaces the validation message from the response', async () => {
        mockAxios.post.mockRejectedValue({
            response: {
                data: { errors: { file: ['The file must be an image.'] } },
            },
        });

        const { result } = renderHook(() => useImageUpload(7));

        await expect(result.current.uploadImage(file)).rejects.toBeDefined();
        expect(mockAddAlert).toHaveBeenCalledWith(
            'The file must be an image.',
            'error',
        );
    });

    test('surfaces the moderation rejection message', async () => {
        mockAxios.post.mockRejectedValue({
            response: { data: { message: 'This image cannot be used.' } },
        });

        const { result } = renderHook(() => useImageUpload(7));

        await expect(result.current.uploadImage(file)).rejects.toBeDefined();
        expect(mockAddAlert).toHaveBeenCalledWith(
            'This image cannot be used.',
            'error',
        );
    });

    test('falls back to a generic message for a non-HTTP failure', async () => {
        mockAxios.isAxiosError.mockReturnValueOnce(false);
        mockAxios.post.mockRejectedValue(new Error('offline'));

        const { result } = renderHook(() => useImageUpload(7));

        await expect(result.current.uploadImage(file)).rejects.toBeDefined();
        expect(mockAddAlert).toHaveBeenCalledWith(
            'The image could not be uploaded. Please try again.',
            'error',
        );
    });
});
