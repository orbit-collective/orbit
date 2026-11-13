import { router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import type { icons } from 'lucide-react';
import { useState } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Icon from '@/Components/Atoms/Icon/Icon';
import Reveal from '@/Components/Atoms/Reveal/Reveal';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import AddRowButton from '@/Components/Molecules/AddRowButton/AddRowButton';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import RowAction from '@/Components/Molecules/RowAction/RowAction';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { DropdownOptionItem } from '@/types/Dropdown';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { riseIn } from '@/utils/motion';
import WorkspaceSettingsDeleteIssueTypeModal from './WorkspaceSettingsDeleteIssueTypeModal';
import WorkspaceSettingsFieldsModal from './WorkspaceSettingsFieldsModal';
import WorkspaceSettingsHierarchyModal from './WorkspaceSettingsHierarchyModal';
import WorkspaceSettingsIssueTypeInlineEditor, {
    IssueTypeFormValues,
} from './WorkspaceSettingsIssueTypeInlineEditor';
import WorkspaceSettingsTemplatesModal from './WorkspaceSettingsTemplatesModal';
import WorkspaceSettingsWorkflowModal from './WorkspaceSettingsWorkflowModal';

interface WorkspaceSettingsIssueTypesTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
    hasIssueTypesAccess?: boolean;
    canCreateIssueTypes?: boolean;
    canUpdateIssueTypes?: boolean;
    canDeleteIssueTypes?: boolean;
    canUpdateWorkflow?: boolean;
}

const NEW_ISSUE_TYPE_EDITOR_TARGET = '__new__';

export default function WorkspaceSettingsIssueTypesTab({
    memberProjects = [],
    selectedProjectId = null,
    issueTypes = [],
    labels = [],
    priorities = [],
    hasIssueTypesAccess = false,
    canCreateIssueTypes = false,
    canUpdateIssueTypes = false,
    canDeleteIssueTypes = false,
    canUpdateWorkflow = false,
}: WorkspaceSettingsIssueTypesTabProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const [editorTarget, setEditorTarget] = useState<string | null>(null);
    const [deletingIssueType, setDeletingIssueType] =
        useState<IssueType | null>(null);
    const [workflowIssueType, setWorkflowIssueType] =
        useState<IssueType | null>(null);
    const [fieldsIssueType, setFieldsIssueType] = useState<IssueType | null>(
        null,
    );
    const [templatesIssueType, setTemplatesIssueType] =
        useState<IssueType | null>(null);
    const [hierarchyIssueType, setHierarchyIssueType] =
        useState<IssueType | null>(null);

    const selectedProject =
        memberProjects.find((project) => project.id === selectedProjectId) ??
        null;

    const switchProject = (projectId: number) => {
        setEditorTarget(null);
        router.get(
            `/settings/issue-types?project=${projectId}`,
            {},
            { preserveScroll: true, preserveState: true },
        );
    };

    if (!selectedProject || !hasIssueTypesAccess) {
        return (
            <SettingsPanel
                id="catalog"
                title={t('workspace_settings_issue_types.tab.title')}
                description={t(
                    'workspace_settings_issue_types.tab.description',
                )}
                icon="Shapes"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? t('workspace_settings_issue_types.tab.no_project')
                            : t('workspace_settings_issue_types.tab.no_access')
                    }
                    description={
                        !selectedProject
                            ? t(
                                  'workspace_settings_issue_types.tab.no_project_hint',
                              )
                            : t(
                                  'workspace_settings_issue_types.tab.no_access_hint',
                              )
                    }
                />
            </SettingsPanel>
        );
    }

    const customCount = issueTypes.filter((type) => !type.isSystem).length;
    const systemCount = issueTypes.length - customCount;
    const editingIssueType =
        editorTarget && editorTarget !== NEW_ISSUE_TYPE_EDITOR_TARGET
            ? (issueTypes.find((type) => String(type.id) === editorTarget) ??
              null)
            : null;

    const toggleCreateEditor = () => {
        setEditorTarget((current) =>
            current === NEW_ISSUE_TYPE_EDITOR_TARGET
                ? null
                : NEW_ISSUE_TYPE_EDITOR_TARGET,
        );
    };

    const toggleEditEditor = (issueType: IssueType) => {
        const target = String(issueType.id);
        setEditorTarget((current) => (current === target ? null : target));
    };

    const openConfiguration = (section: string, issueType: IssueType) => {
        if (section === 'workflow') setWorkflowIssueType(issueType);
        if (section === 'hierarchy') setHierarchyIssueType(issueType);
        if (section === 'templates') setTemplatesIssueType(issueType);
        if (section === 'fields') setFieldsIssueType(issueType);
    };

    const handleSaveIssueType = (values: IssueTypeFormValues) => {
        const onSuccess = () => setEditorTarget(null);
        const onError = () =>
            addAlert(
                t('workspace_settings_issue_types.tab.save_error'),
                'error',
            );

        if (editingIssueType) {
            router.patch(
                route('projects.issue-types.update', [
                    selectedProject.id,
                    editingIssueType.id,
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
            route('projects.issue-types.store', [selectedProject.id]),
            values,
            { preserveScroll: true, preserveState: true, onSuccess, onError },
        );
    };

    const handleConfirmDelete = () => {
        if (!deletingIssueType) return;

        const target = String(deletingIssueType.id);

        router.delete(
            route('projects.issue-types.destroy', [
                selectedProject.id,
                deletingIssueType.id,
            ]),
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    if (editorTarget === target) setEditorTarget(null);
                },
                onError: () =>
                    addAlert(
                        t('workspace_settings_issue_types.tab.delete_error'),
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
                        title={t('workspace_settings_issue_types.tab.total')}
                        value={<AnimatedNumber value={issueTypes.length} />}
                        icon="Shapes"
                        color="accent"
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t('workspace_settings_issue_types.tab.custom')}
                        value={<AnimatedNumber value={customCount} />}
                        icon="Sparkles"
                        color="info"
                    />
                </motion.div>
                <motion.div variants={riseIn}>
                    <StatCard
                        variant="vivid"
                        title={t(
                            'workspace_settings_issue_types.tab.system_count',
                        )}
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
                    'workspace_settings_issue_types.tab.picker_description',
                )}
                onSelect={switchProject}
            />

            <SettingsPanel
                id="catalog"
                collapsedSummary={tChoice(
                    'workspace_settings_issue_types.tab.summary',
                    issueTypes.length,
                )}
                title={t('workspace_settings_issue_types.tab.catalog_title')}
                description={t(
                    'workspace_settings_issue_types.tab.catalog_description',
                    {
                        project: selectedProject.name,
                    },
                )}
                icon="Shapes"
            >
                {issueTypes.map((issueType, index) => {
                    if (editorTarget === String(issueType.id)) {
                        return (
                            <Reveal key={issueType.id}>
                                <WorkspaceSettingsIssueTypeInlineEditor
                                    issueType={issueType}
                                    onSave={handleSaveIssueType}
                                    onCancel={() => setEditorTarget(null)}
                                />
                            </Reveal>
                        );
                    }

                    const configureOptions: DropdownOptionItem[] = [
                        ...(canUpdateWorkflow
                            ? [
                                  {
                                      value: 'workflow',
                                      label: t(
                                          'workspace_settings_issue_types.tab.workflow',
                                      ),
                                      icon: 'Workflow' as const,
                                  },
                              ]
                            : []),
                        ...(canUpdateIssueTypes
                            ? [
                                  {
                                      value: 'hierarchy',
                                      label: t(
                                          'workspace_settings_issue_types.tab.hierarchy',
                                      ),
                                      icon: 'GitBranch' as const,
                                  },
                                  {
                                      value: 'templates',
                                      label: t(
                                          'workspace_settings_issue_types.tab.templates',
                                      ),
                                      icon: 'FileText' as const,
                                  },
                                  {
                                      value: 'fields',
                                      label: t(
                                          'workspace_settings_issue_types.tab.custom_fields',
                                      ),
                                      icon: 'ListChecks' as const,
                                  },
                              ]
                            : []),
                    ];
                    const childTypeCount =
                        issueType.allowedChildTypeIds?.length ?? 0;

                    return (
                        <RowReveal
                            key={issueType.id}
                            index={index}
                            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-(--bg-light-color) sm:px-5"
                        >
                            <span
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                                style={{
                                    backgroundColor: `${issueType.color}1f`,
                                    color: issueType.color,
                                }}
                            >
                                <Icon
                                    name={issueType.icon as keyof typeof icons}
                                    size={16}
                                />
                            </span>
                            <div className="flex min-w-0 flex-1 items-baseline gap-2">
                                <p className="shrink-0 text-sm font-medium text-(--text-color)">
                                    {issueType.name}
                                </p>
                                {issueType.isSystem && (
                                    <span className="shrink-0 rounded-full border border-(--border-color) px-1.5 py-0.5 text-[10px] font-medium text-(--text-gray-color)">
                                        {t(
                                            'workspace_settings_issue_types.tab.system',
                                        )}
                                    </span>
                                )}
                                {issueType.allowsChildren && (
                                    <span className="shrink-0 rounded-full border border-(--border-color) px-1.5 py-0.5 text-[10px] font-medium text-(--text-gray-color)">
                                        {childTypeCount > 0
                                            ? tChoice(
                                                  'workspace_settings_issue_types.tab.allows_n',
                                                  childTypeCount,
                                              )
                                            : t(
                                                  'workspace_settings_issue_types.tab.allows_sub_issues',
                                              )}
                                    </span>
                                )}
                                {issueType.description && (
                                    <p className="truncate text-xs text-(--text-muted-color)">
                                        {issueType.description}
                                    </p>
                                )}
                            </div>
                            {(canUpdateIssueTypes ||
                                configureOptions.length > 0 ||
                                (canDeleteIssueTypes &&
                                    !issueType.isSystem)) && (
                                <div className="flex shrink-0 items-center gap-0.5 transition-opacity [@media(hover:hover)]:sm:opacity-0 [@media(hover:hover)]:sm:group-hover:opacity-100 [@media(hover:hover)]:sm:focus-within:opacity-100">
                                    {configureOptions.length > 0 && (
                                        <Dropdown
                                            variant="menu"
                                            ariaLabel={t(
                                                'workspace_settings_issue_types.tab.configure_aria',
                                                {
                                                    name: issueType.name,
                                                },
                                            )}
                                            align="end"
                                            width={176}
                                            options={configureOptions}
                                            onSelect={(value) =>
                                                openConfiguration(
                                                    value,
                                                    issueType,
                                                )
                                            }
                                            trigger={
                                                <RowAction
                                                    title={t(
                                                        'workspace_settings_issue_types.tab.configure',
                                                    )}
                                                    icon="SlidersHorizontal"
                                                    onClick={() => {}}
                                                />
                                            }
                                        />
                                    )}
                                    {canUpdateIssueTypes && (
                                        <RowAction
                                            title={t(
                                                'workspace_settings_issue_types.tab.edit',
                                            )}
                                            icon="Pencil"
                                            onClick={() =>
                                                toggleEditEditor(issueType)
                                            }
                                        />
                                    )}
                                    {canDeleteIssueTypes &&
                                        !issueType.isSystem && (
                                            <RowAction
                                                title={t(
                                                    'workspace_settings_issue_types.tab.delete',
                                                )}
                                                icon="Trash"
                                                danger
                                                onClick={() =>
                                                    setDeletingIssueType(
                                                        issueType,
                                                    )
                                                }
                                            />
                                        )}
                                </div>
                            )}
                        </RowReveal>
                    );
                })}

                {editorTarget === NEW_ISSUE_TYPE_EDITOR_TARGET ? (
                    <Reveal key={NEW_ISSUE_TYPE_EDITOR_TARGET}>
                        <WorkspaceSettingsIssueTypeInlineEditor
                            issueType={null}
                            onSave={handleSaveIssueType}
                            onCancel={() => setEditorTarget(null)}
                        />
                    </Reveal>
                ) : (
                    canCreateIssueTypes && (
                        <AddRowButton
                            label={t('workspace_settings_issue_types.tab.add')}
                            onClick={toggleCreateEditor}
                        />
                    )
                )}
            </SettingsPanel>

            <WorkspaceSettingsDeleteIssueTypeModal
                isOpen={deletingIssueType !== null}
                onClose={() => setDeletingIssueType(null)}
                issueType={deletingIssueType}
                onConfirm={handleConfirmDelete}
            />

            <WorkspaceSettingsWorkflowModal
                isOpen={workflowIssueType !== null}
                onClose={() => setWorkflowIssueType(null)}
                projectId={selectedProject.id}
                issueType={
                    workflowIssueType
                        ? (issueTypes.find(
                              (type) => type.id === workflowIssueType.id,
                          ) ?? workflowIssueType)
                        : null
                }
                canUpdateWorkflow={canUpdateWorkflow}
            />

            <WorkspaceSettingsTemplatesModal
                isOpen={templatesIssueType !== null}
                onClose={() => setTemplatesIssueType(null)}
                projectId={selectedProject.id}
                issueType={
                    templatesIssueType
                        ? (issueTypes.find(
                              (type) => type.id === templatesIssueType.id,
                          ) ?? templatesIssueType)
                        : null
                }
                labels={labels}
                priorities={priorities}
                canManageTemplates={canUpdateIssueTypes}
            />

            <WorkspaceSettingsFieldsModal
                isOpen={fieldsIssueType !== null}
                onClose={() => setFieldsIssueType(null)}
                projectId={selectedProject.id}
                issueType={
                    fieldsIssueType
                        ? (issueTypes.find(
                              (type) => type.id === fieldsIssueType.id,
                          ) ?? fieldsIssueType)
                        : null
                }
                canManageFields={canUpdateIssueTypes}
            />

            <WorkspaceSettingsHierarchyModal
                isOpen={hierarchyIssueType !== null}
                onClose={() => setHierarchyIssueType(null)}
                projectId={selectedProject.id}
                issueType={
                    hierarchyIssueType
                        ? (issueTypes.find(
                              (type) => type.id === hierarchyIssueType.id,
                          ) ?? hierarchyIssueType)
                        : null
                }
                allIssueTypes={issueTypes}
                canUpdateIssueTypes={canUpdateIssueTypes}
            />
        </div>
    );
}
