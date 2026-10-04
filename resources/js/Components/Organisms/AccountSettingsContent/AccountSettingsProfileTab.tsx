import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsAvatarLibrary from '@/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarLibrary';
import AccountSettingsAvatarUploader from '@/Components/Organisms/AccountSettingsContent/AccountSettingsAvatarUploader';
import AccountSettingsProfilePreview from '@/Components/Organisms/AccountSettingsContent/AccountSettingsProfilePreview';
import { useAlert } from '@/context/AlertContext';
import { cn } from '@/utils/cn';
import { router, useForm } from '@inertiajs/react';
import { SyntheticEvent, useState } from 'react';

const FACE_EXPORT_SIZE = 256;

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
    const { addAlert } = useAlert();

    const { data, setData, post, errors, processing, clearErrors } = useForm({
        name: userName,
    });
    const [avatarSrc, setAvatarSrc] = useState<string | null>(userAvatar);
    const [savedName, setSavedName] = useState(userName);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [selectedFace, setSelectedFace] = useState<string | null>(null);
    const [savingFace, setSavingFace] = useState(false);

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
        setSelectedFace(null);
        addAlert('Avatar reset to default.', 'information');
    };

    // The upload endpoint only accepts JPEG/PNG/GIF, so rasterize the SVG face first.
    const handleSelectFace = async (src: string) => {
        setSavingFace(true);
        try {
            // Fetch the SVG and load it from a blob URL: in dev the asset is served
            // from the Vite origin, and drawing a cross-origin image taints the canvas
            // so `toBlob` throws. The faces also only declare a viewBox, so give the
            // image explicit dimensions.
            const response = await fetch(src);
            const svg = await response.blob();
            const objectUrl = URL.createObjectURL(svg);
            const image = new Image(FACE_EXPORT_SIZE, FACE_EXPORT_SIZE);
            try {
                await new Promise<void>((resolve, reject) => {
                    image.onload = () => resolve();
                    image.onerror = () =>
                        reject(new Error('Image load failed'));
                    image.src = objectUrl;
                });
            } finally {
                URL.revokeObjectURL(objectUrl);
            }

            const canvas = document.createElement('canvas');
            canvas.width = FACE_EXPORT_SIZE;
            canvas.height = FACE_EXPORT_SIZE;
            canvas
                .getContext('2d')
                ?.drawImage(image, 0, 0, FACE_EXPORT_SIZE, FACE_EXPORT_SIZE);

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, 'image/png'),
            );
            if (!blob) {
                throw new Error('Canvas export failed');
            }

            const file = new File([blob], 'avatar.png', { type: 'image/png' });
            setAvatarSrc(canvas.toDataURL('image/png'));
            setSelectedFace(src);

            router.post(
                route('account.upload-avatar'),
                { avatar: file },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        addAlert('Avatar updated successfully.', 'success');
                        setIsLibraryOpen(false);
                    },
                    onError: (e) => addAlert(e.avatar, 'error'),
                    onFinish: () => setSavingFace(false),
                },
            );
        } catch (error) {
            console.error(error);
            addAlert('Failed to load the selected avatar.', 'error');
            setSavingFace(false);
        }
    };

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Profile"
                description="Manage your personal details and how you appear to teammates."
                icon="User"
            >
                <SettingsPanelRow
                    title="Username"
                    description="Teammates will see this name and can @mention you with it."
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
                                placeholder="Your name"
                                className={cn(
                                    'w-56',
                                    errors.name &&
                                        'border-[var(--error-color)] focus:border-[var(--error-color)]',
                                )}
                            />
                            {errors.name && (
                                <span className="text-xs text-[var(--error-color)]">
                                    {errors.name}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5 text-xs text-[var(--text-gray-color)]">
                                {processing ? (
                                    <>
                                        <Icon
                                            name="LoaderCircle"
                                            size={14}
                                            className="animate-spin"
                                        />
                                        Saving...
                                    </>
                                ) : hasUnsavedChanges ? (
                                    <>
                                        <Icon name="CircleAlert" size={14} />
                                        Unsaved changes
                                    </>
                                ) : (
                                    <>
                                        <Icon
                                            name="CircleCheck"
                                            size={14}
                                            className="text-[var(--success-color)]"
                                        />
                                        Changes saved
                                    </>
                                )}
                            </span>
                        </form>
                    }
                />
                <SettingsPanelRow
                    title="Profile photo"
                    description="This photo will be visible to others across Orbit."
                    action={
                        <AccountSettingsAvatarUploader
                            avatarSrc={avatarSrc}
                            initials={initials}
                            onUpload={setAvatarSrc}
                            onReset={() => handleResetAvatar()}
                            onToggleLibrary={() => setIsLibraryOpen((o) => !o)}
                            isLibraryOpen={isLibraryOpen}
                        />
                    }
                />
                {isLibraryOpen && (
                    <SettingsPanelRow
                        title="Avatar library"
                        description="Pick one of the ready-made avatars instead of uploading a photo."
                    >
                        <AccountSettingsAvatarLibrary
                            selectedSrc={selectedFace}
                            disabled={savingFace}
                            onSelect={handleSelectFace}
                        />
                    </SettingsPanelRow>
                )}
            </SettingsPanel>

            <SettingsPanel
                title="Live preview"
                description="Updates instantly as you edit your photo and name."
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
