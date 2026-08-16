import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useAlert } from '@/context/AlertContext';
import { router } from '@inertiajs/react';
import { ChangeEvent, useRef, useState } from 'react';

interface AccountSettingsAvatarUploaderProps {
    avatarSrc: string | null;
    initials: string;
    onUpload: (dataUrl: string) => void;
    onReset: () => void;
}

// Mirrors the `max:5120` (KB) rule enforced in UserController::uploadAvatar.
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export default function AccountSettingsAvatarUploader({
    avatarSrc,
    initials,
    onUpload,
    onReset,
}: AccountSettingsAvatarUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { addAlert } = useAlert();

    const openFilePicker = () => inputRef.current?.click();

    const [processing, setProcessing] = useState(false);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        event.target.value = '';

        if (!file) {
            return;
        }

        const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validMimeTypes.includes(file.type)) {
            addAlert(
                'Invalid image. Please upload a JPEG, PNG, or GIF image.',
                'error',
            );
            return;
        }

        if (file.size > MAX_AVATAR_SIZE_BYTES) {
            addAlert('Image must be smaller than 5 MB.', 'error');
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') return;

            const image = new Image();
            image.src = result;

            image.onload = () => {
                if (image.width > 0 && image.height > 0) {
                    onUpload(result);

                    setProcessing(true);
                    router.post(
                        route('account.upload-avatar'),
                        { avatar: file },
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                addAlert(
                                    'Avatar uploaded successfully.',
                                    'success',
                                );
                            },
                            onError: (e) => {
                                addAlert(e.avatar, 'error');
                            },
                            onFinish: () => {
                                setProcessing(false);
                            },
                        },
                    );
                } else {
                    addAlert('Invalid image file.', 'error');
                }
            };

            image.onerror = () => {
                addAlert(
                    'Failed to load the image. File might be corrupted.',
                    'error',
                );
            };
        };

        reader.readAsDataURL(file);
    };

    const handleReset = () => {
        setProcessing(true);
        router.post(
            route('account.reset-avatar'),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    onReset();
                },
                onError: () => {
                    addAlert('Failed to reset avatar.', 'error');
                },
                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    return (
        <div className="flex items-center gap-3">
            <Avatar
                src={avatarSrc ?? undefined}
                alt="Avatar preview"
                initials={initials}
                size="xl"
            />

            <div className="flex flex-col items-start gap-1.5">
                {!processing ? (
                    <>
                        <button
                            type="button"
                            onClick={openFilePicker}
                            className="rounded-md border border-[var(--border-color-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-color)] transition-colors hover:bg-[var(--bg-light-color)]"
                        >
                            Upload new photo
                        </button>
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={!avatarSrc}
                            className="px-1 text-xs font-medium text-[var(--error-color)] transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
                        >
                            Reset to default
                        </button>
                    </>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs text-[var(--text-gray-color)]">
                        <Icon
                            name="LoaderCircle"
                            size={14}
                            className="animate-spin"
                        />
                        Saving...
                    </span>
                )}
            </div>

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif"
                className="hidden"
                onChange={handleFileChange}
            />
        </div>
    );
}
