import { router } from '@inertiajs/react';
import { useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
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
}: WorkspaceSettingsPrioritiesTabProps) {
    const { addAlert } = useAlert();
    const [editorTarget, setEditorTarget] = useState<string | null>(null);
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
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        {priorities.length}{' '}
                        {priorities.length === 1 ? 'priority' : 'priorities'}{' '}
                        configured
                    </p>
                    {canCreatePriorities && (
                        <Button
                            type="button"
                            onClick={() =>
                                toggleEditor(NEW_PRIORITY_EDITOR_TARGET)
                            }
                            className="gap-1.5"
                        >
                            <Icon name="Plus" size={14} />
                            New priority
                        </Button>
                    )}
                </div>

                {editorTarget === NEW_PRIORITY_EDITOR_TARGET && (
                    <WorkspaceSettingsPriorityInlineEditor
                        key={NEW_PRIORITY_EDITOR_TARGET}
                        priority={null}
                        errors={errors}
                        onSave={handleSave}
                        onCancel={closeEditor}
                    />
                )}

                {priorities.map((priority) =>
                    editorTarget === String(priority.id) ? (
                        <WorkspaceSettingsPriorityInlineEditor
                            key={priority.id}
                            priority={priority}
                            errors={errors}
                            onSave={handleSave}
                            onCancel={closeEditor}
                        />
                    ) : (
                        <div
                            key={priority.id}
                            className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                        >
                            <div className="flex min-w-0 items-center gap-3">
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
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                            {priority.name}
                                        </p>
                                        {priority.isDefault && (
                                            <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                                Default
                                            </span>
                                        )}
                                    </div>
                                    <p className="truncate text-sm text-[var(--text-gray-color)]">
                                        {priority.issueCount === 1
                                            ? '1 issue'
                                            : `${priority.issueCount} issues`}
                                    </p>
                                </div>
                            </div>
                            {canUpdatePriorities && (
                                <button
                                    type="button"
                                    title="Edit priority"
                                    onClick={() =>
                                        toggleEditor(String(priority.id))
                                    }
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                >
                                    <Icon name="Pencil" size={14} />
                                </button>
                            )}
                        </div>
                    ),
                )}
            </SettingsPanel>
        </div>
    );
}
