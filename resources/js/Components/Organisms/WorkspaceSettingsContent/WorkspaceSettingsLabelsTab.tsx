import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Icon from '@/Components/Atoms/Icon/Icon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import AddRowButton from '@/Components/Molecules/AddRowButton/AddRowButton';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import RowAction from '@/Components/Molecules/RowAction/RowAction';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabel } from '@/types/Labels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { riseIn } from '@/utils/motion';
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
    const { t, tChoice } = useLaravelReactI18n();
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
                id="taxonomy"
                title={t('workspace_settings_labels.tab.title')}
                description={t('workspace_settings_labels.tab.description')}
                icon="Tag"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? t('workspace_settings_labels.tab.no_project')
                            : t('workspace_settings_labels.tab.no_access')
                    }
                    description={
                        !selectedProject
                            ? t('workspace_settings_labels.tab.no_project_hint')
                            : t('workspace_settings_labels.tab.no_access_hint')
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
        const onError = () =>
            addAlert(t('workspace_settings_labels.tab.save_error'), 'error');

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
                    addAlert(
                        t('workspace_settings_labels.tab.delete_error'),
                        'error',
                    ),
            },
        );
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t('workspace_settings_labels.tab.total')}
                        value={<AnimatedNumber value={labels.length} />}
                        icon="Tag"
                        color="accent"
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t('workspace_settings_labels.tab.custom')}
                        value={<AnimatedNumber value={customCount} />}
                        icon="Sparkles"
                        color="info"
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t('workspace_settings_labels.tab.system_count')}
                        value={<AnimatedNumber value={systemCount} />}
                        icon="ShieldCheck"
                        color="warning"
                    />
                </motion.div>
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description={t(
                    'workspace_settings_labels.tab.picker_description',
                )}
                onSelect={switchProject}
            />

            <SettingsPanel
                id="taxonomy"
                collapsedSummary={tChoice(
                    'workspace_settings_labels.tab.summary',
                    labels.length,
                )}
                title={t('workspace_settings_labels.tab.title')}
                description={t(
                    'workspace_settings_labels.tab.panel_description',
                    {
                        project: selectedProject.name,
                    },
                )}
                icon="Tag"
            >
                {labels.length === 0 &&
                    editorTarget !== NEW_LABEL_EDITOR_TARGET && (
                        <div className="flex flex-col items-center gap-2 px-5 py-10 text-center">
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-(--bg-light-color) text-(--text-gray-color)">
                                <Icon name="Tag" size={16} />
                            </span>
                            <p className="text-sm font-medium text-(--text-color)">
                                {t('workspace_settings_labels.tab.empty_title')}
                            </p>
                            <p className="max-w-xs text-sm text-(--text-gray-color)">
                                {t(
                                    'workspace_settings_labels.tab.empty_description',
                                )}
                            </p>
                        </div>
                    )}

                {labels.map((label, index) =>
                    editorTarget === String(label.id) ? (
                        <Reveal key={label.id}>
                            <WorkspaceSettingsLabelInlineEditor
                                label={label}
                                onSave={handleSaveLabel}
                                onCancel={() => setEditorTarget(null)}
                            />
                        </Reveal>
                    ) : (
                        <RowReveal
                            key={label.id}
                            index={index}
                            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-(--bg-light-color) sm:px-5"
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
                                <p className="shrink-0 text-sm font-medium text-(--text-color)">
                                    {label.name}
                                </p>
                                {label.isSystem && (
                                    <span className="shrink-0 rounded-full border border-(--border-color) px-1.5 py-0.5 text-[10px] font-medium text-(--text-gray-color)">
                                        {t(
                                            'workspace_settings_labels.tab.system',
                                        )}
                                    </span>
                                )}
                                {label.description && (
                                    <p className="truncate text-xs text-(--text-muted-color)">
                                        {label.description}
                                    </p>
                                )}
                            </div>
                            {(canUpdateLabels || canDeleteLabels) && (
                                <div className="flex shrink-0 items-center gap-0.5 transition-opacity [@media(hover:hover)]:sm:opacity-0 [@media(hover:hover)]:sm:group-hover:opacity-100 [@media(hover:hover)]:sm:focus-within:opacity-100">
                                    {canUpdateLabels && (
                                        <RowAction
                                            title={t(
                                                'workspace_settings_labels.tab.edit',
                                            )}
                                            icon="Pencil"
                                            onClick={() =>
                                                toggleEditEditor(label)
                                            }
                                        />
                                    )}
                                    {canDeleteLabels && (
                                        <RowAction
                                            title={t(
                                                'workspace_settings_labels.tab.delete',
                                            )}
                                            icon="Trash"
                                            danger
                                            onClick={() =>
                                                setDeletingLabel(label)
                                            }
                                        />
                                    )}
                                </div>
                            )}
                        </RowReveal>
                    ),
                )}

                {editorTarget === NEW_LABEL_EDITOR_TARGET ? (
                    <Reveal key={NEW_LABEL_EDITOR_TARGET}>
                        <WorkspaceSettingsLabelInlineEditor
                            label={null}
                            onSave={handleSaveLabel}
                            onCancel={() => setEditorTarget(null)}
                        />
                    </Reveal>
                ) : (
                    canCreateLabels && (
                        <AddRowButton
                            label={t('workspace_settings_labels.tab.add')}
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
