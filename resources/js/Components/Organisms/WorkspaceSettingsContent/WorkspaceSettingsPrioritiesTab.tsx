import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import AddRowButton from '@/Components/Molecules/AddRowButton/AddRowButton';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import RowAction from '@/Components/Molecules/RowAction/RowAction';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { riseIn } from '@/utils/motion';
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
    const { t, tChoice } = useLaravelReactI18n();
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
            <div className="space-y-5">
                {selectedProject && (
                    <ProjectPickerPanel
                        projects={memberProjects}
                        selectedProjectId={selectedProject.id}
                        description={t(
                            'workspace_settings_priorities.tab.picker_description',
                        )}
                        onSelect={switchProject}
                    />
                )}
                <SettingsPanel
                    id="scale"
                    title={t('workspace_settings_priorities.tab.title')}
                    description={t(
                        'workspace_settings_priorities.tab.description',
                    )}
                    icon="Flag"
                >
                    <SettingsPanelRow
                        title={
                            !selectedProject
                                ? t(
                                      'workspace_settings_priorities.tab.no_project',
                                  )
                                : t(
                                      'workspace_settings_priorities.tab.no_access',
                                  )
                        }
                        description={
                            !selectedProject
                                ? t(
                                      'workspace_settings_priorities.tab.no_project_hint',
                                  )
                                : t(
                                      'workspace_settings_priorities.tab.no_access_hint',
                                  )
                        }
                    />
                </SettingsPanel>
            </div>
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
                addAlert(
                    t('workspace_settings_priorities.tab.save_error'),
                    'error',
                );
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
                    addAlert(
                        t('workspace_settings_priorities.tab.reorder_error'),
                        'error',
                    ),
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
                    addAlert(
                        t('workspace_settings_priorities.tab.delete_error'),
                        'error',
                    ),
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
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t('workspace_settings_priorities.tab.levels')}
                        value={<AnimatedNumber value={priorities.length} />}
                        icon="Flag"
                        color="accent"
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t(
                            'workspace_settings_priorities.tab.prioritised',
                        )}
                        value={<AnimatedNumber value={issueCount} />}
                        icon="ListChecks"
                        color="info"
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t(
                            'workspace_settings_priorities.tab.default_for_new',
                        )}
                        value={
                            defaultPriority?.name ??
                            t('workspace_settings_priorities.tab.none')
                        }
                        icon="Star"
                        color="warning"
                    />
                </motion.div>
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description={t(
                    'workspace_settings_priorities.tab.picker_description',
                )}
                onSelect={switchProject}
            />

            <SettingsPanel
                id="scale"
                collapsedSummary={tChoice(
                    'workspace_settings_priorities.tab.summary',
                    priorities.length,
                )}
                title={t('workspace_settings_priorities.tab.title')}
                description={t(
                    'workspace_settings_priorities.tab.panel_description',
                    {
                        project: selectedProject.name,
                    },
                )}
                icon="Flag"
            >
                {priorities.map((priority, index) =>
                    editorTarget === String(priority.id) ? (
                        <Reveal key={priority.id}>
                            <WorkspaceSettingsPriorityInlineEditor
                                priority={priority}
                                errors={errors}
                                saving={saving}
                                onSave={handleSave}
                                onCancel={closeEditor}
                            />
                        </Reveal>
                    ) : (
                        <RowReveal
                            key={priority.id}
                            index={index}
                            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-(--bg-light-color) sm:px-5"
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
                            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 sm:flex-nowrap">
                                <p className="max-w-full truncate text-sm font-medium text-(--text-color)">
                                    {priority.name}
                                </p>
                                {priority.isDefault && (
                                    <span className="shrink-0 rounded-full bg-(--warning-color)/15 px-1.5 py-0.5 text-[10px] font-semibold text-(--warning-color)">
                                        {t(
                                            'workspace_settings_priorities.tab.default',
                                        )}
                                    </span>
                                )}
                                <span className="shrink-0 text-xs text-(--text-muted-color)">
                                    {tChoice(
                                        'workspace_settings_priorities.tab.issue_count',
                                        priority.issueCount,
                                    )}
                                </span>
                            </div>
                            {(canUpdatePriorities || canDeletePriorities) && (
                                <div className="flex shrink-0 items-center gap-0.5 transition-opacity [@media(hover:hover)]:sm:opacity-0 [@media(hover:hover)]:sm:group-hover:opacity-100 [@media(hover:hover)]:sm:focus-within:opacity-100">
                                    {canUpdatePriorities &&
                                        priorities.length > 1 && (
                                            <>
                                                <RowAction
                                                    title={t(
                                                        'workspace_settings_priorities.tab.move_up',
                                                    )}
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
                                                    title={t(
                                                        'workspace_settings_priorities.tab.move_down',
                                                    )}
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
                                            title={t(
                                                'workspace_settings_priorities.tab.edit',
                                            )}
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
                                                title={t(
                                                    'workspace_settings_priorities.tab.delete',
                                                )}
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
                        </RowReveal>
                    ),
                )}

                {editorTarget === NEW_PRIORITY_EDITOR_TARGET ? (
                    <Reveal key={NEW_PRIORITY_EDITOR_TARGET}>
                        <WorkspaceSettingsPriorityInlineEditor
                            priority={null}
                            errors={errors}
                            saving={saving}
                            onSave={handleSave}
                            onCancel={closeEditor}
                        />
                    </Reveal>
                ) : (
                    canCreatePriorities && (
                        <AddRowButton
                            label={t('workspace_settings_priorities.tab.add')}
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
