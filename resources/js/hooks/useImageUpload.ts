import { useAlert } from '@/context/AlertContext';
import axios from 'axios';
import { useCallback, useState } from 'react';

/**
 * Uploads an image to a project's attachment endpoint and resolves with the
 * stored URL, ready to be dropped into a markdown body.
 *
 * Every failure path (validation, NSFW rejection, the moderation service
 * being unreachable) surfaces as a toast here and re-throws, so the editor
 * that called it only has to care about the happy path.
 */
export const useImageUpload = (projectId: number) => {
    const { addAlert } = useAlert();
    const [isUploading, setIsUploading] = useState(false);

    const uploadImage = useCallback(
        async (file: File): Promise<string> => {
            const formData = new FormData();
            formData.append('file', file);

            setIsUploading(true);

            try {
                const { data } = await axios.post<{ url: string }>(
                    route('projects.attachments.store', projectId),
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data' } },
                );

                return data.url;
            } catch (error) {
                addAlert(resolveUploadError(error), 'error');

                throw error;
            } finally {
                setIsUploading(false);
            }
        },
        [projectId, addAlert],
    );

    return { uploadImage, isUploading };
};

const resolveUploadError = (error: unknown): string => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as
            { message?: string; errors?: Record<string, string[]> } | undefined;

        const validationMessage = data?.errors?.file?.[0];
        if (validationMessage) return validationMessage;

        if (data?.message) return data.message;
    }

    return 'The image could not be uploaded. Please try again.';
};

export default useImageUpload;
