import { router } from '@inertiajs/react';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import AddRowButton from '@/Components/Molecules/AddRowButton/AddRowButton';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import RowAction from '@/Components/Molecules/RowAction/RowAction';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabel } from '@/types/Labels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
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
            `/settings/labels?project=${projectId}`,
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
                            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                        >
                            <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                style={{ backgroundColor: `${label.color}1f` }}
                            >
                                <span
                                    className="h-3.5 w-3.5 rounded-full"
                                    style={{ backgroundColor: label.color }}
                                />
                            </span>
                            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                                <p className="shrink-0 text-sm font-medium text-[var(--text-color)]">
                                    {label.name}
                                </p>
                                {label.isSystem && (
                                    <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                        System
                                    </span>
                                )}
                                {label.description && (
                                    <p className="truncate text-xs text-[var(--text-muted-color)]">
                                        {label.description}
                                    </p>
                                )}
                            </div>
                            {(canUpdateLabels || canDeleteLabels) && (
                                <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:opacity-0 sm:focus-within:opacity-100 sm:group-hover:opacity-100">
                                    {canUpdateLabels && (
                                        <RowAction
                                            title="Edit label"
                                            icon="Pencil"
                                            onClick={() =>
                                                toggleEditEditor(label)
                                            }
                                        />
                                    )}
                                    {canDeleteLabels && (
                                        <RowAction
                                            title="Delete label"
                                            icon="Trash"
                                            danger
                                            onClick={() =>
                                                setDeletingLabel(label)
                                            }
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    ),
                )}

                {editorTarget === NEW_LABEL_EDITOR_TARGET ? (
                    <WorkspaceSettingsLabelInlineEditor
                        key={NEW_LABEL_EDITOR_TARGET}
                        label={null}
                        onSave={handleSaveLabel}
                        onCancel={() => setEditorTarget(null)}
                    />
                ) : (
                    canCreateLabels && (
                        <AddRowButton
                            label="Add label"
                            onClick={toggleCreateEditor}
                        />
                    )
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
