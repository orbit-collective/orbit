import { router } from '@inertiajs/react';
import { icons } from 'lucide-react';
import { useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
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
                title="Issue types"
                description="Customize the catalog of issue types used across your issues."
                icon="Shapes"
            >
                <SettingsPanelRow
                    title={
                        !selectedProject
                            ? "You're not part of any project yet"
                            : "You don't have access to this project's issue types"
                    }
                    description={
                        !selectedProject
                            ? 'Create or join a project to manage its issue types here.'
                            : 'Ask a project admin for the issue_types.view permission to see issue types here.'
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
            addAlert('Could not save this issue type.', 'error');

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
                        'Could not delete this issue type. Make sure no issues use it.',
                        'error',
                    ),
            },
        );
    };

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <StatCard
                    variant="vivid"
                    title="Total issue types"
                    value={issueTypes.length}
                    icon="Shapes"
                    color="accent"
                />
                <StatCard
                    variant="vivid"
                    title="Custom issue types"
                    value={customCount}
                    icon="Sparkles"
                    color="info"
                />
                <StatCard
                    variant="vivid"
                    title="System issue types"
                    value={systemCount}
                    icon="ShieldCheck"
                    color="warning"
                />
            </div>

            <ProjectPickerPanel
                projects={memberProjects}
                selectedProjectId={selectedProject.id}
                description="Choose which project's issue type catalog you're editing."
                onSelect={switchProject}
            />

            <SettingsPanel
                title="Issue type catalog"
                description={`Issue types available for issues in ${selectedProject.name}.`}
                icon="Shapes"
            >
                {issueTypes.map((issueType) => {
                    if (editorTarget === String(issueType.id)) {
                        return (
                            <WorkspaceSettingsIssueTypeInlineEditor
                                key={issueType.id}
                                issueType={issueType}
                                onSave={handleSaveIssueType}
                                onCancel={() => setEditorTarget(null)}
                            />
                        );
                    }

                    const configureOptions: DropdownOptionItem[] = [
                        ...(canUpdateWorkflow
                            ? [
                                  {
                                      value: 'workflow',
                                      label: 'Workflow',
                                      icon: 'Workflow' as const,
                                  },
                              ]
                            : []),
                        ...(canUpdateIssueTypes
                            ? [
                                  {
                                      value: 'hierarchy',
                                      label: 'Hierarchy',
                                      icon: 'GitBranch' as const,
                                  },
                                  {
                                      value: 'templates',
                                      label: 'Templates',
                                      icon: 'FileText' as const,
                                  },
                                  {
                                      value: 'fields',
                                      label: 'Custom fields',
                                      icon: 'ListChecks' as const,
                                  },
                              ]
                            : []),
                    ];
                    const childTypeCount =
                        issueType.allowedChildTypeIds?.length ?? 0;

                    return (
                        <div
                            key={issueType.id}
                            className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
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
                                <p className="shrink-0 text-sm font-medium text-[var(--text-color)]">
                                    {issueType.name}
                                </p>
                                {issueType.isSystem && (
                                    <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                        System
                                    </span>
                                )}
                                {issueType.allowsChildren && (
                                    <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                        {childTypeCount > 0
                                            ? `Allows ${childTypeCount} sub-issue type${childTypeCount === 1 ? '' : 's'}`
                                            : 'Allows sub-issues'}
                                    </span>
                                )}
                                {issueType.description && (
                                    <p className="truncate text-xs text-[var(--text-muted-color)]">
                                        {issueType.description}
                                    </p>
                                )}
                            </div>
                            {(canUpdateIssueTypes ||
                                configureOptions.length > 0 ||
                                (canDeleteIssueTypes &&
                                    !issueType.isSystem)) && (
                                <div className="flex shrink-0 items-center gap-0.5 transition-opacity [@media(hover:hover)]:sm:opacity-0 [@media(hover:hover)]:sm:focus-within:opacity-100 [@media(hover:hover)]:sm:group-hover:opacity-100">
                                    {configureOptions.length > 0 && (
                                        <Dropdown
                                            variant="menu"
                                            ariaLabel={`Configure ${issueType.name}`}
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
                                                    title="Configure"
                                                    icon="SlidersHorizontal"
                                                    onClick={() => {}}
                                                />
                                            }
                                        />
                                    )}
                                    {canUpdateIssueTypes && (
                                        <RowAction
                                            title="Edit issue type"
                                            icon="Pencil"
                                            onClick={() =>
                                                toggleEditEditor(issueType)
                                            }
                                        />
                                    )}
                                    {canDeleteIssueTypes &&
                                        !issueType.isSystem && (
                                            <RowAction
                                                title="Delete issue type"
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
                        </div>
                    );
                })}

                {editorTarget === NEW_ISSUE_TYPE_EDITOR_TARGET ? (
                    <WorkspaceSettingsIssueTypeInlineEditor
                        key={NEW_ISSUE_TYPE_EDITOR_TARGET}
                        issueType={null}
                        onSave={handleSaveIssueType}
                        onCancel={() => setEditorTarget(null)}
                    />
                ) : (
                    canCreateIssueTypes && (
                        <AddRowButton
                            label="Add issue type"
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
