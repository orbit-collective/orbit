import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabel } from '@/types/Labels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import WorkspaceSettingsDeleteLabelModal from './WorkspaceSettingsDeleteLabelModal';
import WorkspaceSettingsLabelInlineEditor from './WorkspaceSettingsLabelInlineEditor';

interface WorkspaceSettingsLabelsTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    labels?: ProjectLabel[];
    hasLabelsAccess?: boolean;
    canCreateLabels?: boolean;
    canUpdateLabels?: boolean;
    canDeleteLabels?: boolean;
}

const NEW_LABEL_EDITOR_TARGET = '__new__';

export default function WorkspaceSettingsLabelsTab({
    memberProjects = [],
    selectedProjectId = null,
    labels = [],
    hasLabelsAccess = false,
    canCreateLabels = false,
    canUpdateLabels = false,
    canDeleteLabels = false,
}: WorkspaceSettingsLabelsTabProps) {
    const { addAlert } = useAlert();
    const [editorTarget, setEditorTarget] = useState<string | null>(null);
    const [deletingLabel, setDeletingLabel] = useState<ProjectLabel | null>(
        null,
    );

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        setEditorTarget(null);
        router.get(
            `/settings?tab=labels&project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    if (!selectedProject || !hasLabelsAccess) {
        return (
            <SettingsPanel
                title="Label taxonomy"
                description="Define label taxonomy used across issues and projects."
                icon="Tag"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? "You're not part of any project yet"
                            : "You don't have access to this project's labels"
                    }
                    description={
                        !selectedProject
                            ? 'Create or join a project to manage its labels here.'
                            : 'Ask a project admin for the labels.view permission to see labels here.'
                    }
                />
            </SettingsPanel>
        );
    }

    const customCount = labels.filter((label) => !label.isSystem).length;
    const systemCount = labels.length - customCount;
    const editingLabel =
        editorTarget && editorTarget !== NEW_LABEL_EDITOR_TARGET
            ? (labels.find((label) => String(label.id) === editorTarget) ??
              null)
            : null;

    const toggleCreateEditor = () => {
        setEditorTarget((current) =>
            current === NEW_LABEL_EDITOR_TARGET
                ? null
                : NEW_LABEL_EDITOR_TARGET,
        );
    };

    const toggleEditEditor = (label: ProjectLabel) => {
        const target = String(label.id);
        setEditorTarget((current) => (current === target ? null : target));
    };

    const handleSaveLabel = (values: {
        name: string;
        color: string;
        description: string;
    }) => {
        const onSuccess = () => setEditorTarget(null);
        const onError = () => addAlert('Could not save this label.', 'error');

        if (editingLabel) {
            router.patch(
                route('projects.labels.update', [
                    selectedProject.id,
                    editingLabel.id,
                ]),
                values,
                {
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess,
                    onError,
                },
            );
            return;
        }

        router.post(
            route('projects.labels.store', [selectedProject.id]),
            values,
            { preserveScroll: true, preserveState: true, onSuccess, onError },
        );
    };

    const handleConfirmDelete = () => {
        if (!deletingLabel) return;

        const target = String(deletingLabel.id);

        router.delete(
            route('projects.labels.destroy', [
                selectedProject.id,
                deletingLabel.id,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (editorTarget === target) setEditorTarget(null);
                },
                onError: () =>
                    addAlert('Could not delete this label.', 'error'),
            },
        );
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    variant="vivid"
                    title="Total labels"
                    value={labels.length}
                    icon="Tag"
                    color="accent"
                />
                <StatCard
                    variant="vivid"
                    title="Custom labels"
                    value={customCount}
                    icon="Sparkles"
                    color="info"
                />
                <StatCard
                    variant="vivid"
                    title="System labels"
                    value={systemCount}
                    icon="ShieldCheck"
                    color="warning"
                />
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's label taxonomy you're editing."
                onSelect={switchProject}
            />

            <SettingsPanel
                title="Label taxonomy"
                description={`Labels available for issues in ${selectedProject.name}.`}
                icon="Tag"
            >
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        {labels.length}{' '}
                        {labels.length === 1 ? 'label' : 'labels'} configured
                    </p>
                    {canCreateLabels && (
                        <Button
                            type="button"
                            onClick={toggleCreateEditor}
                            className="gap-1.5"
                        >
                            <Icon name="Plus" size={14} />
                            New label
                        </Button>
                    )}
                </div>

                {editorTarget === NEW_LABEL_EDITOR_TARGET && (
                    <WorkspaceSettingsLabelInlineEditor
                        key={NEW_LABEL_EDITOR_TARGET}
                        label={null}
                        onSave={handleSaveLabel}
                        onCancel={() => setEditorTarget(null)}
                    />
                )}

                {labels.length === 0 &&
                    editorTarget !== NEW_LABEL_EDITOR_TARGET && (
                        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--bg-light-color)] text-[var(--text-gray-color)]">
                                <Icon name="Tag" size={16} />
                            </span>
                            <p className="text-sm font-medium text-[var(--text-color)]">
                                No labels yet
                            </p>
                            <p className="max-w-xs text-sm text-[var(--text-gray-color)]">
                                Create your first label to start categorizing
                                issues in this project.
                            </p>
                        </div>
                    )}

                {labels.map((label) =>
                    editorTarget === String(label.id) ? (
                        <WorkspaceSettingsLabelInlineEditor
                            key={label.id}
                            label={label}
                            onSave={handleSaveLabel}
                            onCancel={() => setEditorTarget(null)}
                        />
                    ) : (
                        <div
                            key={label.id}
                            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span
                                    className="h-3 w-3 shrink-0 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                            {label.name}
                                        </p>
                                        {label.isSystem && (
                                            <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                                System
                                            </span>
                                        )}
                                    </div>
                                    {label.description && (
                                        <p className="truncate text-sm text-[var(--text-gray-color)]">
                                            {label.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {(canUpdateLabels || canDeleteLabels) && (
                                <div className="flex shrink-0 items-center gap-1">
                                    {canUpdateLabels && (
                                        <button
                                            type="button"
                                            title="Edit label"
                                            onClick={() =>
                                                toggleEditEditor(label)
                                            }
                                            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                        >
                                            <Icon name="Pencil" size={14} />
                                        </button>
                                    )}
                                    {canDeleteLabels && (
                                        <button
                                            type="button"
                                            title="Delete label"
                                            onClick={() =>
                                                setDeletingLabel(label)
                                            }
                                            className="hover:bg-[var(--error-color)]/10 flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                        >
                                            <Icon name="Trash" size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ),
                )}
            </SettingsPanel>

            <WorkspaceSettingsDeleteLabelModal
                isOpen={deletingLabel !== null}
                onClose={() => setDeletingLabel(null)}
                label={deletingLabel}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
