import { router } from '@inertiajs/react';
import { useState } from 'react';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import AddRowButton from '@/Components/Molecules/AddRowButton/AddRowButton';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import RowAction from '@/Components/Molecules/RowAction/RowAction';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsDeletePriorityModal from './WorkspaceSettingsDeletePriorityModal';
import WorkspaceSettingsPriorityInlineEditor, {
    PriorityFormValues,
} from './WorkspaceSettingsPriorityInlineEditor';

interface WorkspaceSettingsPrioritiesTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    priorities?: SettingsPriority[];
    hasPrioritiesAccess?: boolean;
    canCreatePriorities?: boolean;
    canUpdatePriorities?: boolean;
    canDeletePriorities?: boolean;
}

const NEW_PRIORITY_EDITOR_TARGET = '__new__';

export default function WorkspaceSettingsPrioritiesTab({
    memberProjects = [],
    selectedProjectId = null,
    priorities = [],
    hasPrioritiesAccess = false,
    canCreatePriorities = false,
    canUpdatePriorities = false,
    canDeletePriorities = false,
}: WorkspaceSettingsPrioritiesTabProps) {
    const { addAlert } = useAlert();
    const [editorTarget, setEditorTarget] = useState<string | null>(null);
    const [deletingPriority, setDeletingPriority] =
        useState<SettingsPriority | null>(null);
    const [saving, setSaving] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [errors, setErrors] = useState<
        Partial<Record<keyof PriorityFormValues, string>>
    >({});

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const closeEditor = () => {
        setEditorTarget(null);
        setErrors({});
    };

    const switchProject = (projectId: number) => {
        closeEditor();
        router.get(
            `/settings/priorities?project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    if (!selectedProject || !hasPrioritiesAccess) {
        return (
            <SettingsPanel
                title="Priority scale"
                description="Name, color and order the priorities issues can have."
                icon="Flag"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? "You're not part of any project yet"
                            : "You don't have access to this project's priorities"
                    }
                    description={
                        !selectedProject
                            ? 'Create or join a project to manage its priorities here.'
                            : 'Ask a project admin for the priorities.view permission to see priorities here.'
                    }
                />
            </SettingsPanel>
        );
    }

    const editingPriority =
        editorTarget && editorTarget !== NEW_PRIORITY_EDITOR_TARGET
            ? (priorities.find(
                  (priority) => String(priority.id) === editorTarget,
              ) ?? null)
            : null;

    const toggleEditor = (target: string) => {
        setErrors({});
        setEditorTarget((current) => (current === target ? null : target));
    };

    const handleSave = (values: PriorityFormValues) => {
        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
            onSuccess: closeEditor,
            onError: (serverErrors: Record<string, string>) => {
                setErrors(serverErrors);
                addAlert('Could not save this priority.', 'error');
            },
        };

        if (editingPriority) {
            router.patch(
                route('projects.priorities.update', [
                    selectedProject.id,
                    editingPriority.id,
                ]),
                values,
                options,
            );
            return;
        }

        router.post(
            route('projects.priorities.store', [selectedProject.id]),
            values,
            options,
        );
    };

    const handleMove = (index: number, direction: -1 | 1) => {
        if (reordering) return;

        const order = priorities.map((priority) => priority.id);
        const target = index + direction;
        [order[index], order[target]] = [order[target], order[index]];

        router.patch(
            route('projects.priorities.reorder', [selectedProject.id]),
            { order },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setReordering(true),
                onFinish: () => setReordering(false),
                onError: () =>
                    addAlert('Could not reorder the priorities.', 'error'),
            },
        );
    };

    const handleConfirmDelete = (replacementId: number | null) => {
        if (!deletingPriority) return;

        const target = String(deletingPriority.id);

        router.delete(
            route('projects.priorities.destroy', [
                selectedProject.id,
                deletingPriority.id,
            ]),
            {
                data: { replacement_id: replacementId },
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (editorTarget === target) closeEditor();
                },
                onError: () =>
                    addAlert('Could not delete this priority.', 'error'),
            },
        );
    };

    const defaultPriority = priorities.find((priority) => priority.isDefault);
    const issueCount = priorities.reduce(
        (sum, priority) => sum + priority.issueCount,
        0,
    );

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    variant="vivid"
                    title="Priority levels"
                    value={priorities.length}
                    icon="Flag"
                    color="accent"
                />
                <StatCard
                    variant="vivid"
                    title="Issues prioritised"
                    value={issueCount}
                    icon="ListChecks"
                    color="info"
                />
                <StatCard
                    variant="vivid"
                    title="Default for new issues"
                    value={defaultPriority?.name ?? 'None'}
                    icon="Star"
                    color="warning"
                />
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's priority scale you're viewing."
                onSelect={switchProject}
            />

            <SettingsPanel
                title="Priority scale"
                description={`Priorities available for issues in ${selectedProject.name}, most important first.`}
                icon="Flag"
            >
                {priorities.map((priority, index) =>
                    editorTarget === String(priority.id) ? (
                        <WorkspaceSettingsPriorityInlineEditor
                            key={priority.id}
                            priority={priority}
                            errors={errors}
                            saving={saving}
                            onSave={handleSave}
                            onCancel={closeEditor}
                        />
                    ) : (
                        <div
                            key={priority.id}
                            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                        >
                            <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    backgroundColor: `${priority.color}1f`,
                                }}
                            >
                                <PriorityIcon
                                    priority={priority}
                                    tooltip={false}
                                />
                            </span>
                            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <p className="max-w-full truncate text-sm font-medium text-[var(--text-color)]">
                                    {priority.name}
                                </p>
                                {priority.isDefault && (
                                    <span className="bg-[var(--warning-color)]/15 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-[var(--warning-color)]">
                                        Default
                                    </span>
                                )}
                                <span className="shrink-0 text-xs text-[var(--text-muted-color)]">
                                    {priority.issueCount === 1
                                        ? '1 issue'
                                        : `${priority.issueCount} issues`}
                                </span>
                            </div>
                            {(canUpdatePriorities || canDeletePriorities) && (
                                <div className="flex shrink-0 items-center gap-0.5 transition-opacity [@media(hover:hover)]:sm:opacity-0 [@media(hover:hover)]:sm:focus-within:opacity-100 [@media(hover:hover)]:sm:group-hover:opacity-100">
                                    {canUpdatePriorities &&
                                        priorities.length > 1 && (
                                            <>
                                                <RowAction
                                                    title="Move up"
                                                    icon="ArrowUp"
                                                    disabled={
                                                        reordering ||
                                                        index === 0
                                                    }
                                                    onClick={() =>
                                                        handleMove(index, -1)
                                                    }
                                                />
                                                <RowAction
                                                    title="Move down"
                                                    icon="ArrowDown"
                                                    disabled={
                                                        reordering ||
                                                        index ===
                                                            priorities.length -
                                                                1
                                                    }
                                                    onClick={() =>
                                                        handleMove(index, 1)
                                                    }
                                                />
                                            </>
                                        )}
                                    {canUpdatePriorities && (
                                        <RowAction
                                            title="Edit priority"
                                            icon="Pencil"
                                            onClick={() =>
                                                toggleEditor(
                                                    String(priority.id),
                                                )
                                            }
                                        />
                                    )}
                                    {canDeletePriorities &&
                                        priorities.length > 1 && (
                                            <RowAction
                                                title="Delete priority"
                                                icon="Trash"
                                                danger
                                                onClick={() =>
                                                    setDeletingPriority(
                                                        priority,
                                                    )
                                                }
                                            />
                                        )}
                                </div>
                            )}
                        </div>
                    ),
                )}

                {editorTarget === NEW_PRIORITY_EDITOR_TARGET ? (
                    <WorkspaceSettingsPriorityInlineEditor
                        key={NEW_PRIORITY_EDITOR_TARGET}
                        priority={null}
                        errors={errors}
                        saving={saving}
                        onSave={handleSave}
                        onCancel={closeEditor}
                    />
                ) : (
                    canCreatePriorities && (
                        <AddRowButton
                            label="Add priority"
                            onClick={() =>
                                toggleEditor(NEW_PRIORITY_EDITOR_TARGET)
                            }
                        />
                    )
                )}
            </SettingsPanel>

            <WorkspaceSettingsDeletePriorityModal
                isOpen={deletingPriority !== null}
                onClose={() => setDeletingPriority(null)}
                priority={deletingPriority}
                otherPriorities={priorities.filter(
                    (priority) => priority.id !== deletingPriority?.id,
                )}
                onConfirm={handleConfirmDelete}
            />
        </div>
    );
}
