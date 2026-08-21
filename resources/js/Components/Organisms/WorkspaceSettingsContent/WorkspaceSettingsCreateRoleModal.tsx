import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import ModalFooter from '@/Components/Molecules/ModalFooter/ModalFooter';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useAlert } from '@/context/AlertContext';
import { router } from '@inertiajs/react';
import { SyntheticEvent, useEffect, useState } from 'react';

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
                    addAlert(`The "${name}" role has been created.`, 'success');
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
                title="Create a custom role"
                onClose={handleClose}
                icon={
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-color-opacity)] text-[var(--accent-color)]">
                        <Icon name="Sparkles" size={16} />
                    </span>
                }
            />

            <form onSubmit={handleSubmit}>
                <div className="space-y-4 px-6 py-5">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        New roles start with every permission turned off. You'll
                        fine-tune exactly what this role can do from the
                        permission matrix right after creating it.
                    </p>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="role-name"
                            className="text-sm font-medium text-[var(--text-color)]"
                        >
                            Name
                        </label>
                        <Input
                            id="role-name"
                            variant="modal"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="e.g. QA Engineer"
                        />
                        {errors.name && (
                            <span className="text-xs text-[var(--error-color)]">
                                {errors.name}
                            </span>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label
                            htmlFor="role-slug"
                            className="text-sm font-medium text-[var(--text-color)]"
                        >
                            Slug
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
                            <span className="text-xs text-[var(--error-color)]">
                                {errors.slug}
                            </span>
                        )}
                    </div>
                </div>

                <ModalFooter
                    onCancel={handleClose}
                    submitLabel="Create role"
                    isSubmitting={isSubmitting}
                />
            </form>
        </Modal>
    );
}
