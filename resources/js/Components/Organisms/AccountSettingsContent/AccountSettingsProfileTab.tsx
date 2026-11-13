import { router, useForm } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Collapse from '@/Components/Molecules/Collapse/Collapse';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsAvatarLibrary from '@/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarLibrary';
import AccountSettingsAvatarUploader from '@/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarUploader';
import AccountSettingsProfilePreview from '@/Components/Organisms/AccountSettingsContent/AccountSettingsProfilePreview';
import { useAlert } from '@/context/AlertContext';
import { cn } from '@/utils/cn';
import { canvasToBlob, rasterizeImage } from '@/utils/faces';
import { DURATION, EASE } from '@/utils/motion';

const getInitials = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
        return '?';
    }

    const [first, ...rest] = trimmed.split(/\s+/);
    const last = rest.length > 0 ? rest[rest.length - 1] : '';

    return (first.charAt(0) + last.charAt(0)).toUpperCase();
};

interface AccountSettingsProfileTabProps {
    userName?: string;
    userAvatar?: string | null;
}

export default function AccountSettingsProfileTab({
    userName = 'John Doe',
    userAvatar = null,
}: AccountSettingsProfileTabProps) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();

    const { data, setData, post, errors, processing, clearErrors } = useForm({
        name: userName,
    });
    const [avatarSrc, setAvatarSrc] = useState<string | null>(userAvatar);
    const [savedName, setSavedName] = useState(userName);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [savingFace, setSavingFace] = useState(false);
    const [uploading, setUploading] = useState(false);

    const initials = getInitials(data.name);
    const hasUnsavedChanges = data.name.trim() !== savedName.trim();

    const handleSubmitUsername = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('account.rename'), {
            preserveScroll: true,
            onSuccess: () => {
                setSavedName(data.name);
                clearErrors('name');
            },
        });
    };

    const handleResetAvatar = () => {
        setAvatarSrc(null);
        addAlert(t('account_settings.profile.avatar_reset'), 'information');
    };

    // The upload endpoint only accepts JPEG/PNG/GIF, so rasterize the SVG face first.
    const handleSelectFace = async (src: string) => {
        setSavingFace(true);
        try {
            const canvas = await rasterizeImage(src);
            const blob = await canvasToBlob(canvas);

            const file = new File([blob], 'avatar.png', { type: 'image/png' });
            const previousAvatarSrc = avatarSrc;
            setAvatarSrc(canvas.toDataURL('image/png'));

            router.post(
                route('account.upload-avatar'),
                { avatar: file },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        addAlert(
                            t('account_settings.profile.avatar_updated'),
                            'success',
                        );
                        setIsLibraryOpen(false);
                    },
                    onError: (e) => {
                        setAvatarSrc(previousAvatarSrc);
                        addAlert(
                            e.avatar ??
                                t(
                                    'account_settings.profile.avatar_update_failed',
                                ),
                            'error',
                        );
                    },
                    onFinish: () => setSavingFace(false),
                },
            );
        } catch (error) {
            console.error(error);
            addAlert(t('account_settings.profile.avatar_load_failed'), 'error');
            setSavingFace(false);
        }
    };

    return (
        <div className="space-y-5">
            <SettingsPanel
                id="profile"
                collapsedSummary={data.name}
                title={t('account_settings.profile.title')}
                description={t('account_settings.profile.description')}
                icon="User"
            >
                <SettingsPanelRow
                    title={t('account_settings.profile.username')}
                    description={t(
                        'account_settings.profile.username_description',
                    )}
                    action={
                        <form
                            onSubmit={handleSubmitUsername}
                            className="flex flex-col gap-1.5"
                        >
                            <Input
                                name="name"
                                value={data.name}
                                onChange={(event) => {
                                    setData('name', event.target.value);
                                    if (errors.name) {
                                        clearErrors('name');
                                    }
                                }}
                                placeholder={t(
                                    'account_settings.profile.name_placeholder',
                                )}
                                className={cn(
                                    'w-56',
                                    errors.name &&
                                        'border-(--error-color) focus:border-(--error-color)',
                                )}
                            />
                            {errors.name && (
                                <span className="text-xs text-(--error-color)">
                                    {errors.name}
                                </span>
                            )}
                            <span className="relative flex h-4 items-center overflow-hidden text-xs text-(--text-gray-color)">
                                {/* The save state swaps with the shared motion, so a change reads as an event. */}
                                <AnimatePresence mode="wait" initial={false}>
                                    <motion.span
                                        key={
                                            processing
                                                ? 'saving'
                                                : hasUnsavedChanges
                                                  ? 'unsaved'
                                                  : 'saved'
                                        }
                                        className="flex items-center gap-1.5"
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{
                                            duration: DURATION.fast,
                                            ease: EASE,
                                        }}
                                    >
                                        {processing ? (
                                            <>
                                                <Icon
                                                    name="LoaderCircle"
                                                    size={14}
                                                    className="animate-spin"
                                                />
                                                {t(
                                                    'account_settings.profile.saving',
                                                )}
                                            </>
                                        ) : hasUnsavedChanges ? (
                                            <>
                                                <Icon
                                                    name="CircleExclamationPoint"
                                                    size={14}
                                                />
                                                {t(
                                                    'account_settings.profile.unsaved',
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <Icon
                                                    name="CircleCheck"
                                                    size={14}
                                                    className="text-(--success-color)"
                                                />
                                                {t(
                                                    'account_settings.profile.saved',
                                                )}
                                            </>
                                        )}
                                    </motion.span>
                                </AnimatePresence>
                            </span>
                        </form>
                    }
                />
                <SettingsPanelRow
                    title={t('account_settings.profile.photo')}
                    description={t(
                        'account_settings.profile.photo_description',
                    )}
                    action={
                        <AccountSettingsAvatarUploader
                            avatarSrc={avatarSrc}
                            initials={initials}
                            onUpload={setAvatarSrc}
                            onReset={() => handleResetAvatar()}
                            onToggleLibrary={() => setIsLibraryOpen((o) => !o)}
                            isLibraryOpen={isLibraryOpen}
                            busy={savingFace}
                            onProcessingChange={setUploading}
                        />
                    }
                />
                <Collapse open={isLibraryOpen} unmountWhenClosed>
                    <SettingsPanelRow
                        title={t('account_settings.avatar.library')}
                        description={t(
                            'account_settings.avatar.library_description',
                        )}
                    >
                        <AccountSettingsAvatarLibrary
                            avatarSrc={avatarSrc}
                            disabled={savingFace || uploading}
                            onSelect={handleSelectFace}
                        />
                    </SettingsPanelRow>
                </Collapse>
            </SettingsPanel>

            <SettingsPanel
                id="preview"
                title={t('account_settings.profile.preview_title')}
                description={t('account_settings.profile.preview_description')}
                icon="Eye"
            >
                <AccountSettingsProfilePreview
                    name={data.name}
                    avatarSrc={avatarSrc}
                    initials={initials}
                />
            </SettingsPanel>
        </div>
    );
}
