import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import Avatar from '@/Components/Atoms/Avatar/Avatar';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useAlert } from '@/context/AlertContext';

interface AccountSettingsAvatarUploaderProps {
    avatarSrc: string | null;
    initials: string;
    onUpload: (dataUrl: string) => void;
    onReset: () => void;
    onToggleLibrary?: () => void;
    isLibraryOpen?: boolean;
    /** True while the parent is saving an avatar chosen elsewhere (e.g. the library). */
    busy?: boolean;
    onProcessingChange?: (processing: boolean) => void;
}

// Mirrors the `max:5120` (KB) rule enforced in UserController::uploadAvatar.
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

export default function AccountSettingsAvatarUploader({
    avatarSrc,
    initials,
    onUpload,
    onReset,
    onToggleLibrary,
    isLibraryOpen = false,
    busy = false,
    onProcessingChange,
}: AccountSettingsAvatarUploaderProps) {
    const { t } = useLaravelReactI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const { addAlert } = useAlert();

    const openFilePicker = () => inputRef.current?.click();

    const [processing, setProcessing] = useState(false);
    const isBusy = processing || busy;

    useEffect(() => {
        onProcessingChange?.(processing);
    }, [processing, onProcessingChange]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        event.target.value = '';

        if (!file || busy) {
            return;
        }

        const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!validMimeTypes.includes(file.type)) {
            addAlert(t('account_settings.avatar.invalid_type'), 'error');
            return;
        }

        if (file.size > MAX_AVATAR_SIZE_BYTES) {
            addAlert(t('account_settings.avatar.too_large'), 'error');
            return;
        }

        // Mark the upload as in flight while the file is still being read, so
        // the library cannot start a competing save in that window.
        setProcessing(true);

        const reader = new FileReader();

        reader.onload = () => {
            const result = reader.result;
            if (typeof result !== 'string') {
                setProcessing(false);
                return;
            }

            const image = new Image();
            image.src = result;

            image.onload = () => {
                if (image.width > 0 && image.height > 0) {
                    onUpload(result);

                    router.post(
                        route('account.upload-avatar'),
                        { avatar: file },
                        {
                            preserveScroll: true,
                            onSuccess: () => {
                                addAlert(
                                    t('account_settings.avatar.uploaded'),
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
                    setProcessing(false);
                    addAlert(
                        t('account_settings.avatar.invalid_file'),
                        'error',
                    );
                }
            };

            image.onerror = () => {
                setProcessing(false);
                addAlert(t('account_settings.avatar.load_failed'), 'error');
            };
        };

        reader.onerror = () => {
            setProcessing(false);
            addAlert(t('account_settings.avatar.read_failed'), 'error');
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
                    addAlert(
                        t('account_settings.avatar.reset_failed'),
                        'error',
                    );
                },
                onFinish: () => {
                    setProcessing(false);
                },
            },
        );
    };

    return (
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={onToggleLibrary}
                disabled={!onToggleLibrary}
                aria-expanded={onToggleLibrary ? isLibraryOpen : undefined}
                aria-label={t('account_settings.avatar.choose_aria')}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-color) enabled:cursor-pointer enabled:hover:opacity-80"
            >
                <Avatar
                    src={avatarSrc ?? undefined}
                    alt={t('account_settings.avatar.preview_alt')}
                    initials={initials}
                    size="xl"
                />
            </button>

            <div className="flex flex-col items-start gap-1.5">
                {!isBusy ? (
                    <>
                        <button
                            type="button"
                            onClick={openFilePicker}
                            className="rounded-md border border-(--border-color-strong) px-3 py-1.5 text-xs font-medium text-(--text-color) transition-colors hover:bg-(--bg-light-color)"
                        >
                            {t('account_settings.avatar.upload')}
                        </button>
                        {onToggleLibrary && (
                            <button
                                type="button"
                                onClick={onToggleLibrary}
                                aria-expanded={isLibraryOpen}
                                className="flex items-center gap-1.5 rounded-md border border-(--border-color-strong) px-3 py-1.5 text-xs font-medium text-(--text-color) transition-colors hover:bg-(--bg-light-color)"
                            >
                                <Icon name="Images" size={14} />
                                {t('account_settings.avatar.choose')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleReset}
                            disabled={!avatarSrc}
                            className="px-1 text-xs font-medium text-(--error-color) transition-colors hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:no-underline"
                        >
                            {t('account_settings.avatar.reset')}
                        </button>
                    </>
                ) : (
                    <span className="flex items-center gap-1.5 text-xs text-(--text-gray-color)">
                        <Icon
                            name="LoaderCircle"
                            size={14}
                            className="animate-spin"
                        />
                        {t('account_settings.avatar.saving')}
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
