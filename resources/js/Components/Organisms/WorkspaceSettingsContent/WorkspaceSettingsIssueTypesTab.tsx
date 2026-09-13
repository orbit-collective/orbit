import Button from '@/Components/Atoms/Button/Button';
import Icon from '@/Components/Atoms/Icon/Icon';
import ProjectPickerPanel from '@/Components/Molecules/ProjectPickerPanel/ProjectPickerPanel';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import StatCard from '@/Components/Molecules/StatCard/StatCard';
import { useAlert } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { router } from '@inertiajs/react';
import { icons } from 'lucide-react';
import { useState } from 'react';
import WorkspaceSettingsDeleteIssueTypeModal from './WorkspaceSettingsDeleteIssueTypeModal';
import WorkspaceSettingsFieldsModal from './WorkspaceSettingsFieldsModal';
import WorkspaceSettingsHierarchyModal from './WorkspaceSettingsHierarchyModal';
import WorkspaceSettingsIssueTypeInlineEditor from './WorkspaceSettingsIssueTypeInlineEditor';
import WorkspaceSettingsTemplatesModal from './WorkspaceSettingsTemplatesModal';
import WorkspaceSettingsWorkflowModal from './WorkspaceSettingsWorkflowModal';

interface WorkspaceSettingsIssueTypesTabProps {
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
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

    const handleSaveIssueType = (values: {
        name: string;
        icon: string;
        color: string;
        description: string;
        allows_children: boolean;
        is_top_level: boolean;
        required_fields: string[];
        restricted_role_types: string[];
    }) => {
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
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <p className="text-sm text-[var(--text-gray-color)]">
                        {issueTypes.length}{' '}
                        {issueTypes.length === 1 ? 'issue type' : 'issue types'}{' '}
                        configured
                    </p>
                    {canCreateIssueTypes && (
                        <Button
                            type="button"
                            onClick={toggleCreateEditor}
                            className="gap-1.5"
                        >
                            <Icon name="Plus" size={14} />
                            New issue type
                        </Button>
                    )}
                </div>

                {issueTypes.map((issueType) => (
                    <div
                        key={issueType.id}
                        className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-light-color)] sm:px-5"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{
                                    backgroundColor: `${issueType.color}1a`,
                                    color: issueType.color,
                                }}
                            >
                                <Icon
                                    name={issueType.icon as keyof typeof icons}
                                    size={15}
                                />
                            </span>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="truncate text-sm font-medium text-[var(--text-color)]">
                                        {issueType.name}
                                    </p>
                                    {issueType.isSystem && (
                                        <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                            System
                                        </span>
                                    )}
                                    {issueType.allowsChildren && (
                                        <span className="shrink-0 rounded-full border border-[var(--border-color)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-gray-color)]">
                                            {issueType.allowedChildTypeIds &&
                                            issueType.allowedChildTypeIds
                                                .length > 0
                                                ? `Allows ${issueType.allowedChildTypeIds.length} sub-issue type${issueType.allowedChildTypeIds.length === 1 ? '' : 's'}`
                                                : 'Allows sub-issues'}
                                        </span>
                                    )}
                                </div>
                                {issueType.description && (
                                    <p className="truncate text-sm text-[var(--text-gray-color)]">
                                        {issueType.description}
                                    </p>
                                )}
                            </div>
                        </div>
                        {(canUpdateIssueTypes ||
                            canUpdateWorkflow ||
                            (canDeleteIssueTypes && !issueType.isSystem)) && (
                            <div className="flex shrink-0 items-center gap-1">
                                {canUpdateWorkflow && (
                                    <button
                                        type="button"
                                        title="Manage workflow"
                                        onClick={() =>
                                            setWorkflowIssueType(issueType)
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                    >
                                        <Icon name="Workflow" size={14} />
                                    </button>
                                )}
                                {canUpdateIssueTypes && (
                                    <button
                                        type="button"
                                        title="Manage hierarchy"
                                        onClick={() =>
                                            setHierarchyIssueType(issueType)
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                    >
                                        <Icon name="GitBranch" size={14} />
                                    </button>
                                )}
                                {canUpdateIssueTypes && (
                                    <button
                                        type="button"
                                        title="Manage templates"
                                        onClick={() =>
                                            setTemplatesIssueType(issueType)
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                    >
                                        <Icon name="FileText" size={14} />
                                    </button>
                                )}
                                {canUpdateIssueTypes && (
                                    <button
                                        type="button"
                                        title="Manage fields"
                                        onClick={() =>
                                            setFieldsIssueType(issueType)
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                    >
                                        <Icon name="ListChecks" size={14} />
                                    </button>
                                )}
                                {canUpdateIssueTypes && (
                                    <button
                                        type="button"
                                        title="Edit issue type"
                                        onClick={() =>
                                            toggleEditEditor(issueType)
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                    >
                                        <Icon name="Pencil" size={14} />
                                    </button>
                                )}
                                {canDeleteIssueTypes && !issueType.isSystem && (
                                    <button
                                        type="button"
                                        title="Delete issue type"
                                        onClick={() =>
                                            setDeletingIssueType(issueType)
                                        }
                                        className="hover:bg-[var(--error-color)]/10 flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:text-[var(--error-color)]"
                                    >
                                        <Icon name="Trash" size={14} />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </SettingsPanel>

            {editorTarget !== null && (
                <WorkspaceSettingsIssueTypeInlineEditor
                    key={editorTarget}
                    issueType={editingIssueType}
                    onSave={handleSaveIssueType}
                    onCancel={() => setEditorTarget(null)}
                />
            )}

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
