import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { WorkspaceLabelDefinition } from '@/types/Settings';
import { LABEL_COLORS } from '@/utils/labelColors';
import { useMemo, useState } from 'react';
import WorkspaceSettingsDeleteLabelModal from './WorkspaceSettingsDeleteLabelModal';
import WorkspaceSettingsLabelInlineEditor from './WorkspaceSettingsLabelInlineEditor';

interface WorkspaceSettingsLabelsTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
}

const NEW_LABEL_EDITOR_TARGET = '__new__';

const DEFAULT_LABELS: WorkspaceLabelDefinition[] = [
    {
        id: 'bug',
        name: 'bug',
        color: LABEL_COLORS.bug,
        description: 'Something isn’t working as expected.',
        isSystem: true,
    },
    {
        id: 'feature',
        name: 'feature',
        color: LABEL_COLORS.feature,
        description: 'A new capability or request.',
        isSystem: true,
    },
    {
        id: 'performance',
        name: 'performance',
        color: LABEL_COLORS.performance,
        description: 'Related to speed, load, or resource usage.',
        isSystem: true,
    },
    {
        id: 'design',
        name: 'design',
        color: LABEL_COLORS.design,
        description: 'Visual, layout, or interaction design work.',
        isSystem: true,
    },
    {
        id: 'ux',
        name: 'ux',
        color: LABEL_COLORS.ux,
        description: 'Usability and user-experience concerns.',
        isSystem: true,
    },
    {
        id: 'chore',
        name: 'chore',
        color: LABEL_COLORS.chore,
        description: 'Maintenance work with no direct user impact.',
        isSystem: true,
    },
];

export default function WorkspaceSettingsLabelsTab({
    memberProjects = [],
    selectedProjectId = null,
}: WorkspaceSettingsLabelsTabProps) {
    const [activeProjectId, setActiveProjectId] = useState<number | null>(
        selectedProjectId ?? memberProjects[0]?.id ?? null,
    );
    const [labelsByProject, setLabelsByProject] = useState<
        Record<number, WorkspaceLabelDefinition[]>
    >({});
    const [editorTarget, setEditorTarget] = useState<string | null>(null);
    const [deletingLabel, setDeletingLabel] =
        useState<WorkspaceLabelDefinition | null>(null);

    const activeProject = useMemo(
        () => memberProjects.find((project) => project.id === activeProjectId),
        [memberProjects, activeProjectId],
    );

    const labels = useMemo(
        () =>
            activeProjectId !== null
                ? (labelsByProject[activeProjectId] ?? DEFAULT_LABELS)
                : DEFAULT_LABELS,
        [labelsByProject, activeProjectId],
    );

    const customCount = labels.filter((label) => !label.isSystem).length;
    const systemCount = labels.length - customCount;
    const editingLabel =
        editorTarget && editorTarget !== NEW_LABEL_EDITOR_TARGET
            ? (labels.find((label) => label.id === editorTarget) ?? null)
            : null;

    const updateLabels = (
        updater: (
            current: WorkspaceLabelDefinition[],
        ) => WorkspaceLabelDefinition[],
    ) => {
        if (activeProjectId === null) return;

        setLabelsByProject((prev) => ({
            ...prev,
            [activeProjectId]: updater(prev[activeProjectId] ?? DEFAULT_LABELS),
        }));
    };

    const toggleCreateEditor = () => {
        setEditorTarget((current) =>
            current === NEW_LABEL_EDITOR_TARGET
                ? null
                : NEW_LABEL_EDITOR_TARGET,
        );
    };

    const toggleEditEditor = (label: WorkspaceLabelDefinition) => {
        setEditorTarget((current) => (current === label.id ? null : label.id));
    };

    const handleSaveLabel = (values: {
        name: string;
        color: string;
        description: string;
    }) => {
        if (editingLabel) {
            updateLabels((current) =>
                current.map((label) =>
                    label.id === editingLabel.id
                        ? { ...label, ...values }
                        : label,
                ),
            );
        } else {
            const newLabel: WorkspaceLabelDefinition = {
                id: `custom-${Date.now()}`,
                isSystem: false,
                ...values,
            };

            updateLabels((current) => [...current, newLabel]);
        }

        setEditorTarget(null);
    };

    const handleConfirmDelete = () => {
        if (!deletingLabel) return;

        updateLabels((current) =>
            current.filter((label) => label.id !== deletingLabel.id),
        );

        if (editorTarget === deletingLabel.id) {
            setEditorTarget(null);
        }
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
                selectedProjectId={activeProjectId ?? 0}
                description="Choose which project's label taxonomy you're editing."
                onSelect={(projectId) => {
                    setActiveProjectId(projectId);
                    setEditorTarget(null);
                }}
            />

            <SettingsPanel
                title="Label taxonomy"
                description={
                    activeProject
                        ? `Labels available for issues in ${activeProject.name}.`
                        : 'Define label taxonomy used across issues and projects.'
                }
                icon="Tag"
            >
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        {labels.length}{' '}
                        {labels.length === 1 ? 'label' : 'labels'} configured
                    </p>
                    <Button
                        type="button"
                        onClick={toggleCreateEditor}
                        className="gap-1.5"
                    >
                        <Icon name="Plus" size={14} />
                        New label
                    </Button>
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
                    editorTarget === label.id ? (
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
                            <div className="flex shrink-0 items-center gap-1">
                                <button
                                    type="button"
                                    title="Edit label"
                                    onClick={() => toggleEditEditor(label)}
                                    className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                >
                                    <Icon name="Pencil" size={14} />
                                </button>
                                <button
                                    type="button"
                                    title="Delete label"
                                    onClick={() => setDeletingLabel(label)}
                                    className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                                >
                                    <Icon name="Trash" size={14} />
                                </button>
                            </div>
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
