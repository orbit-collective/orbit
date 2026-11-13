import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { SyntheticEvent, useEffect, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalFooter from '@/Components/Molecules/ModalFooter/ModalFooter';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';

interface WorkspaceSettingsCreateRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: number;
}

const slugify = (value: string): string =>
    value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

export default function WorkspaceSettingsCreateRoleModal({
    isOpen,
    onClose,
    projectId,
}: WorkspaceSettingsCreateRoleModalProps) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [errors, setErrors] = useState<{ name?: string; slug?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setName('');
            setSlug('');
            setSlugTouched(false);
            setErrors({});
        }
    }, [isOpen]);

    useEffect(() => {
        if (!slugTouched) {
            setSlug(slugify(name));
        }
    }, [name, slugTouched]);

    const handleClose = () => {
        if (isSubmitting) {
            return;
        }
        onClose();
    };

    const handleSubmit = (event: SyntheticEvent) => {
        event.preventDefault();

        router.post(
            `/projects/${projectId}/roles`,
            { name, slug, role: 'custom' },
            {
                preserveScroll: true,
                onStart: () => setIsSubmitting(true),
                onFinish: () => setIsSubmitting(false),
                onSuccess: () => {
                    addAlert(
                        t('workspace_settings_modals_a.create_role.created', {
                            name,
                        }),
                        'success',
                    );
                    onClose();
                },
                onError: (validationErrors) => {
                    setErrors({
                        name: validationErrors.name,
                        slug: validationErrors.slug,
                    });
                },
            },
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="sm">
            <ModalHeader
                title={t('workspace_settings_modals_a.create_role.title')}
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--accent-color-opacity) text-(--accent-color)">
                        <Icon name="Sparkles" size={16} />
                    </span>
                }
            />

            <form onSubmit={handleSubmit}>
                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm text-(--text-gray-color)">
                        {t('workspace_settings_modals_a.create_role.intro')}
                    </p>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="role-name"
                            className="text-sm font-medium text-(--text-color)"
                        >
                            {t('workspace_settings_modals_a.create_role.name')}
                        </label>
                        <Input
                            id="role-name"
                            variant="modal"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={t(
                                'workspace_settings_modals_a.create_role.name_placeholder',
                            )}
                        />
                        {errors.name && (
                            <span className="text-xs text-(--error-color)">
                                {errors.name}
                            </span>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="role-slug"
                            className="text-sm font-medium text-(--text-color)"
                        >
                            {t('workspace_settings_modals_a.create_role.slug')}
                        </label>
                        <Input
                            id="role-slug"
                            variant="modal"
                            value={slug}
                            onChange={(event) => {
                                setSlugTouched(true);
                                setSlug(slugify(event.target.value));
                            }}
                            placeholder="qa-engineer"
                        />
                        {errors.slug && (
                            <span className="text-xs text-(--error-color)">
                                {errors.slug}
                            </span>
                        )}
                    </div>
                </div>

                <ModalFooter
                    onCancel={handleClose}
                    submitLabel={t(
                        'workspace_settings_modals_a.create_role.submit',
                    )}
                    isSubmitting={isSubmitting}
                />
            </form>
        </Modal>
    );
}
