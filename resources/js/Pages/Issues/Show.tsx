import EditableSelect from '@/Components/Atoms/EditableSelect/EditableSelect';
import EditableText from '@/Components/Atoms/EditableText/EditableText';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import { StatusIcon } from '@/Components/Atoms/StatusIcon/StatusIcon';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import Calendar from '@/Components/Molecules/Calendar/Calendar';
import CommentForm from '@/Components/Molecules/CommentForm/CommentForm';
import CommentList from '@/Components/Molecules/CommentList/CommentList';
import EditableLabelList from '@/Components/Molecules/EditableLabelList/EditableLabelList';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import IssueCustomField from '@/Components/Molecules/IssueCustomField/IssueCustomField';
import SidebarField from '@/Components/Molecules/SidebarField/SidebarField';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import IssueChildrenPanel from '@/Components/Organisms/IssueChildrenPanel/IssueChildrenPanel';
import IssueDevelopmentPanel from '@/Components/Organisms/IssueDevelopmentPanel/IssueDevelopmentPanel';
import IssuePageHeader from '@/Components/Organisms/IssuePageHeader/IssuePageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { IssuePageProps } from '@/types/Components';
import { Comment, IssueLabel, IssuePriority, Status } from '@/types/Issues';
import { formatStatusLabel } from '@/utils/text';
import { formatDate } from '@/utils/time';
import type { FormDataConvertible } from '@inertiajs/core';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

const STATUSES: Status[] = ['open', 'in_progress', 'closed'];
const PRIORITIES: IssuePriority[] = ['high', 'medium', 'low'];

export default function Show({
    project,
    projects,
    issue,
    users,
    labels = [],
    issueTypes = [],
    ancestors = [],
    linkedPullRequests = [],
    githubRepositories = [],
    githubDefaultBranchName = '',
    canCreateGithubDevelopment = false,
}: IssuePageProps) {
    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);
    const { uploadImage } = useImageUpload(project.id);
    const { addAlert } = useAlert();

    const createGithubBranch = (input: {
        repositoryId: number;
        name: string;
        baseBranch?: string;
    }) => {
        router.post(
            route('issues.github.branches.store', issue.id),
            {
                repository_id: input.repositoryId,
                name: input.name,
                base_branch: input.baseBranch,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    addAlert(
                        errors.branch ?? 'Failed to create the branch.',
                        'error',
                    );
                },
            },
        );
    };

    const createGithubPullRequest = (input: {
        repositoryId: number;
        title: string;
        head: string;
        base: string;
    }) => {
        router.post(
            route('issues.github.pull-requests.store', issue.id),
            {
                repository_id: input.repositoryId,
                title: input.title,
                head: input.head,
                base: input.base,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    addAlert(
                        errors.pullRequest ??
                            'Failed to create the pull request.',
                        'error',
                    );
                },
            },
        );
    };

    const updateIssue = (data: Record<string, FormDataConvertible>) => {
        router.patch(route('issues.update', issue.id), data, {
            preserveScroll: true,
        });
    };

    const toLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const parseDate = (value?: string) =>
        value ? new Date(value.replace(/-/g, '/')) : undefined;

    const addComment = (body: string, mentionedUserIds: number[]) => {
        router.post(
            route('comments.store', issue.id),
            { body, mentioned_user_ids: mentionedUserIds },
            { preserveScroll: true },
        );
    };

    const editComment = (comment: Comment, body: string) => {
        router.patch(
            route('comments.update', comment.id),
            { body },
            { preserveScroll: true },
        );
    };

    const deleteComment = (comment: Comment) => {
        router.delete(route('comments.destroy', comment.id), {
            preserveScroll: true,
        });
    };

    const workflowStatuses = issue.issueType?.statuses ?? [];
    const transitions = issue.issueType?.transitions ?? [];
    const currentStatusId = issue.workflowStatus?.id ?? null;

    /**
     * Only statuses the workflow actually permits moving to from here, so
     * the picker can't offer a transition the backend would reject. With no
     * current status yet (a legacy issue), every status is reachable.
     */
    const reachableStatuses = workflowStatuses.filter(
        (status) =>
            currentStatusId === null ||
            status.id === currentStatusId ||
            transitions.some(
                (transition) =>
                    transition.fromStatusId === currentStatusId &&
                    transition.toStatusId === status.id,
            ),
    );

    const workflowStatusOptions = reachableStatuses.map((status) => ({
        value: String(status.id),
        searchLabel: status.name,
        label: <WorkflowStatusBadge status={status} />,
    }));

    const legacyStatusOptions = STATUSES.map((status) => ({
        value: status,
        label: (
            <div className="flex items-center gap-2">
                <StatusIcon status={status} tooltip={false} />
                <span className="capitalize">{formatStatusLabel(status)}</span>
            </div>
        ),
    }));

    const customFields = issue.issueType?.fields ?? [];
    const customFieldValues = issue.custom_fields ?? {};

    const saveCustomField = (
        fieldId: number,
        value: string | number | boolean | null,
    ) =>
        updateIssue({
            custom_fields: { [fieldId]: value } as never,
        });

    const issueTypeOptions = issueTypes.map((type) => ({
        value: String(type.id),
        searchLabel: type.name,
        label: <IssueTypeBadge issueType={type} />,
    }));

    const priorityOptions = PRIORITIES.map((priority) => ({
        value: priority,
        label: (
            <div className="flex items-center gap-2">
                <PriorityIcon priority={priority} tooltip={false} />
                <span className="capitalize">{priority}</span>
            </div>
        ),
    }));

    const assigneeOptions = [
        {
            value: '',
            searchLabel: 'Unassigned',
            label: (
                <span className="flex items-center gap-2 text-[var(--text-gray-color)]">
                    <Icon name="UserX" size={14} />
                    Unassigned
                </span>
            ),
        },
        ...users.map((user) => ({
            value: String(user.id),
            searchLabel: user.name,
            label: (
                <UserBadge
                    avatarSrc={user.avatar ?? undefined}
                    name={user.name}
                    size="sm"
                    showTooltip={false}
                />
            ),
        })),
    ];

    return (
        <ProjectLabelsProvider labels={labels}>
            <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
                <Sidebar projects={projects} />
                <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                    <IssuePageHeader
                        project={project}
                        issue={issue}
                        ancestors={ancestors}
                    />
                    <main className="flex flex-1 flex-col overflow-y-auto">
                        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[1fr_260px]">
                            <div className="flex min-w-0 flex-col gap-4">
                                <EditableText
                                    as="h1"
                                    value={issue.title}
                                    onSave={(value) =>
                                        updateIssue({ title: value })
                                    }
                                    placeholder="Issue title"
                                    displayClassName="text-2xl font-semibold text-[var(--text-color)]"
                                    inputClassName="text-2xl font-semibold"
                                />

                                <EditableMarkdown
                                    value={issue.description || ''}
                                    onSave={(value) =>
                                        updateIssue({ description: value })
                                    }
                                    onImageUpload={uploadImage}
                                    placeholder="Add a description..."
                                />

                                {issue.issueType?.allowsChildren && (
                                    <IssueChildrenPanel
                                        project={project}
                                        issue={issue}
                                        issueTypes={issueTypes}
                                    />
                                )}

                                <div className="mt-2 flex flex-col gap-3 border-t border-[var(--border-color)] pt-4">
                                    <span className="text-sm font-medium text-[var(--text-color)]">
                                        Activity
                                    </span>
                                    <CommentList
                                        comments={issue.comments || []}
                                        users={users}
                                        onEdit={editComment}
                                        onDelete={deleteComment}
                                        onImageUpload={uploadImage}
                                    />
                                    <CommentForm
                                        onSubmit={addComment}
                                        users={users}
                                        onImageUpload={uploadImage}
                                    />
                                </div>
                            </div>

                            <div className="sticky top-6 flex flex-col gap-3 self-start">
                                {issueTypeOptions.length > 0 && (
                                    <SidebarField label="Type">
                                        <EditableSelect
                                            value={
                                                issue.issueType
                                                    ? String(issue.issueType.id)
                                                    : ''
                                            }
                                            options={issueTypeOptions}
                                            bare
                                            header="Change issue type to..."
                                            onSave={(value) =>
                                                updateIssue({
                                                    issue_type_id:
                                                        Number(value),
                                                })
                                            }
                                            renderValue={() =>
                                                issue.issueType ? (
                                                    <IssueTypeBadge
                                                        issueType={
                                                            issue.issueType
                                                        }
                                                    />
                                                ) : (
                                                    <span className="text-sm text-[var(--text-gray-color)]">
                                                        No type
                                                    </span>
                                                )
                                            }
                                        />
                                    </SidebarField>
                                )}

                                <SidebarField label="Status">
                                    {workflowStatusOptions.length > 0 ? (
                                        <EditableSelect
                                            value={
                                                currentStatusId !== null
                                                    ? String(currentStatusId)
                                                    : ''
                                            }
                                            options={workflowStatusOptions}
                                            bare
                                            header="Change status to..."
                                            onSave={(value) =>
                                                updateIssue({
                                                    workflow_status_id:
                                                        Number(value),
                                                })
                                            }
                                            renderValue={() =>
                                                issue.workflowStatus ? (
                                                    <WorkflowStatusBadge
                                                        status={
                                                            issue.workflowStatus
                                                        }
                                                    />
                                                ) : (
                                                    <span className="text-sm text-[var(--text-gray-color)]">
                                                        No status
                                                    </span>
                                                )
                                            }
                                        />
                                    ) : (
                                        <EditableSelect
                                            value={issue.status}
                                            options={legacyStatusOptions}
                                            header="Change status to..."
                                            onSave={(value) =>
                                                updateIssue({ status: value })
                                            }
                                            renderValue={(value) => (
                                                <div className="flex items-center gap-2">
                                                    <StatusIcon
                                                        status={value}
                                                        tooltip={false}
                                                    />
                                                    <span className="text-sm capitalize text-[var(--text-color)]">
                                                        {formatStatusLabel(
                                                            value,
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        />
                                    )}
                                </SidebarField>

                                <SidebarField label="Priority">
                                    <EditableSelect
                                        value={issue.priority}
                                        options={priorityOptions}
                                        header="Change priority to..."
                                        onSave={(value) =>
                                            updateIssue({ priority: value })
                                        }
                                        renderValue={(value) => (
                                            <div className="flex items-center gap-2">
                                                <PriorityIcon
                                                    priority={value}
                                                    tooltip={false}
                                                />
                                                <span className="text-sm capitalize text-[var(--text-color)]">
                                                    {value}
                                                </span>
                                            </div>
                                        )}
                                    />
                                </SidebarField>

                                <SidebarField label="Assignee">
                                    <EditableSelect
                                        value={
                                            issue.assignee_id
                                                ? String(issue.assignee_id)
                                                : ''
                                        }
                                        options={assigneeOptions}
                                        header="Change assignee to..."
                                        onSave={(value) =>
                                            updateIssue({
                                                assignee_id: value
                                                    ? Number(value)
                                                    : null,
                                            })
                                        }
                                        renderValue={() =>
                                            issue.assignee ? (
                                                <UserBadge
                                                    avatarSrc={
                                                        issue.assignee.avatar
                                                    }
                                                    name={issue.assignee.name}
                                                    size="sm"
                                                    showTooltip={false}
                                                />
                                            ) : (
                                                <span className="flex items-center gap-2 text-[var(--text-gray-color)]">
                                                    <Icon
                                                        name="UserX"
                                                        size={14}
                                                    />
                                                    Unassigned
                                                </span>
                                            )
                                        }
                                    />
                                </SidebarField>

                                {customFields.map((field) => (
                                    <SidebarField
                                        key={field.id}
                                        label={
                                            field.isRequired
                                                ? `${field.label} *`
                                                : field.label
                                        }
                                    >
                                        <IssueCustomField
                                            field={field}
                                            value={
                                                customFieldValues[field.id] ??
                                                null
                                            }
                                            onSave={(value) =>
                                                saveCustomField(field.id, value)
                                            }
                                        />
                                    </SidebarField>
                                ))}

                                <SidebarField label="Labels">
                                    <EditableLabelList
                                        labels={issue.labels || []}
                                        onSave={(labels: IssueLabel[]) =>
                                            updateIssue({ labels })
                                        }
                                    />
                                </SidebarField>

                                <SidebarField label="Project">
                                    <Link
                                        href={route(
                                            'projects.show',
                                            project.id,
                                        )}
                                        className="flex items-center gap-2 rounded-full px-1.5 py-1 text-sm text-[var(--text-color)] hover:bg-[var(--bg-light-color)]"
                                    >
                                        <Icon name="FolderGit2" size={14} />
                                        {project.name}
                                    </Link>
                                </SidebarField>

                                {(linkedPullRequests.length > 0 ||
                                    githubRepositories.length > 0) && (
                                    <SidebarField label="Development">
                                        <IssueDevelopmentPanel
                                            pullRequests={linkedPullRequests}
                                            repositories={githubRepositories}
                                            defaultBranchName={
                                                githubDefaultBranchName
                                            }
                                            onCreateBranch={
                                                canCreateGithubDevelopment
                                                    ? createGithubBranch
                                                    : undefined
                                            }
                                            onCreatePullRequest={
                                                canCreateGithubDevelopment
                                                    ? createGithubPullRequest
                                                    : undefined
                                            }
                                        />
                                    </SidebarField>
                                )}

                                <SidebarField label="Dates">
                                    <div className="flex items-center gap-1">
                                        <Icon
                                            name="Calendar"
                                            size={14}
                                            className="mr-1 text-[var(--text-gray-color)]"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowStartDate(true);
                                                setShowEndDate(false);
                                            }}
                                            className="rounded-full px-1.5 py-1 text-xs text-[var(--text-color)] hover:bg-[var(--bg-light-color)]"
                                        >
                                            {issue.start_date || 'Start date'}
                                        </button>
                                        <span className="text-xs text-[var(--text-gray-color)]">
                                            —
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEndDate(true);
                                                setShowStartDate(false);
                                            }}
                                            className="rounded-full px-1.5 py-1 text-xs text-[var(--text-color)] hover:bg-[var(--bg-light-color)]"
                                        >
                                            {issue.end_date || 'End date'}
                                        </button>
                                    </div>
                                </SidebarField>

                                <div className="mt-auto flex flex-col gap-2 border-t border-[var(--border-color)] pt-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-gray-color)]">
                                            Created
                                        </span>
                                        <span className="text-xs text-[var(--text-gray-color)]">
                                            {formatDate(issue.created_at)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-gray-color)]">
                                            Modified
                                        </span>
                                        <span className="text-xs text-[var(--text-gray-color)]">
                                            {formatDate(issue.updated_at)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </main>
                </div>
                {(showStartDate || showEndDate) && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--overlay-color)] backdrop-blur-[2px]"
                        onClick={() => {
                            setShowStartDate(false);
                            setShowEndDate(false);
                        }}
                    >
                        <div onClick={(e) => e.stopPropagation()}>
                            {showStartDate && (
                                <Calendar
                                    selectedDate={parseDate(issue.start_date)}
                                    onSelect={(date) => {
                                        const newStartDate =
                                            toLocalDateString(date);
                                        updateIssue({
                                            start_date: newStartDate,
                                            ...(issue.end_date &&
                                            issue.end_date < newStartDate
                                                ? { end_date: newStartDate }
                                                : {}),
                                        });
                                        setShowStartDate(false);
                                    }}
                                    onClose={() => setShowStartDate(false)}
                                />
                            )}
                            {showEndDate && (
                                <Calendar
                                    selectedDate={parseDate(issue.end_date)}
                                    minDate={parseDate(issue.start_date)}
                                    rangeStart={parseDate(issue.start_date)}
                                    onSelect={(date) => {
                                        updateIssue({
                                            end_date: toLocalDateString(date),
                                        });
                                        setShowEndDate(false);
                                    }}
                                    onClose={() => setShowEndDate(false)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </ProjectLabelsProvider>
    );
}
