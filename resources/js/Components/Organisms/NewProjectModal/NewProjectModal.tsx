import IconButton from '@/Components/Atoms/IconButton/IconButton';
import Input from '@/Components/Atoms/Input/Input';
import Modal from '@/Components/Atoms/Modal/Modal';
import TextArea from '@/Components/Atoms/TextArea/TextArea';
import ProjectCard from '@/Components/Molecules/ProjectCard/ProjectCard';
import SidebarField from '@/Components/Molecules/SidebarField/SidebarField';
import { NewProjectModalProps } from '@/types/Components';
import { AVAILABLE_COLORS } from '@/types/Projects';
import { getColorTheme } from '@/utils/colors';
import { useForm } from '@inertiajs/react';
import React, { SyntheticEvent, useEffect } from 'react';

const NewProjectModal: React.FC<NewProjectModalProps> = ({
    isOpen,
    onClose,
}) => {
    const { data, setData, post, processing, reset, errors } = useForm({
        name: '',
        slug: '',
        description: '',
        color: AVAILABLE_COLORS[0],
    });

    useEffect(() => {
        if (isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        post(route('projects.store'), {
            onSuccess: () => {
                onClose();
                reset();
            },
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <div className="flex h-full flex-col overflow-y-auto">
                <div className="flex items-start justify-between border-b border-[var(--bg-light-color)] p-6">
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold text-[var(--text-color)]">
                            Create New Project
                        </h2>
                        <p className="mt-1 text-sm text-[var(--text-gray-color)]">
                            Set up a new project to organize your work and
                            collaborate with your team
                        </p>
                    </div>
                    <IconButton iconName="X" onClick={onClose} iconSize={20} />
                </div>
                <form
                    onSubmit={handleSubmit}
                    className="flex flex-1 flex-col overflow-hidden"
                >
                    <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-[1fr_50%]">
                        <div className="flex flex-col gap-5">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[var(--text-color)]">
                                    Project name
                                    <span className="text-[var(--error-color)]">
                                        {' '}
                                        *
                                    </span>
                                </label>
                                <Input
                                    value={data.name}
                                    onChange={(e) =>
                                        setData('name', e.target.value)
                                    }
                                    placeholder="Enter project name"
                                    variant="modal"
                                />
                                {errors.name && (
                                    <span className="text-xs text-[var(--error-color)]">
                                        {errors.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[var(--text-color)]">
                                    Slug
                                    <span className="text-[var(--error-color)]">
                                        {' '}
                                        *
                                    </span>
                                </label>
                                <Input
                                    value={data.slug}
                                    onChange={(e) =>
                                        setData('slug', e.target.value)
                                    }
                                    placeholder="e.g. MOB"
                                    variant="modal"
                                />
                                {errors.slug && (
                                    <span className="text-xs text-[var(--error-color)]">
                                        {errors.slug}
                                    </span>
                                )}
                                <p className="text-xs text-[var(--text-gray-color)]">
                                    Unique key to identify your project
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-medium text-[var(--text-color)]">
                                    Description
                                </label>
                                <TextArea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    placeholder="Describe your project..."
                                    variant="modal"
                                />
                                {errors.description && (
                                    <span className="text-xs text-[var(--error-color)]">
                                        {errors.description}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            <SidebarField label="Color">
                                <div className="flex flex-wrap gap-3">
                                    {AVAILABLE_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() =>
                                                setData('color', color)
                                            }
                                            className={`h-6 w-6 rounded-full border border-solid transition-transform ${getColorTheme(color).accent} ${
                                                data.color === color
                                                    ? 'scale-110 border-white'
                                                    : 'border-transparent hover:scale-110'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </SidebarField>
                            <ProjectCard
                                project={{
                                    id: 0,
                                    name: data.name,
                                    slug: data.slug,
                                    description: data.description,
                                    color: data.color,
                                    created_at: 0,
                                    updated_at: 0,
                                }}
                                issues={[]}
                            />
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 border-t border-[var(--bg-light-color)] px-6 py-4">
                        <button
                            type="button"
                            className="cursor-pointer rounded-lg border-none bg-transparent px-4 py-2 text-sm font-medium text-[var(--text-gray-color)] transition-colors duration-150 hover:text-[var(--text-color)]"
                            onClick={onClose}
                            disabled={processing}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent-color)] px-6 py-2 text-sm font-medium text-[var(--text-color)] transition-all duration-150 ease-in-out hover:bg-[var(--accent-light-color)] disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Create project'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default NewProjectModal;
