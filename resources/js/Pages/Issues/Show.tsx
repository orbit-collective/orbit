import type { FormDataConvertible } from '@inertiajs/core';
import { Link, router, usePage } from '@inertiajs/react';
import type { Variants } from 'framer-motion';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EditableText from '@/Components/Atoms/EditableText/EditableText';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import { PageSection, PageStage } from '@/Components/Atoms/PageStage/PageStage';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import Skeleton from '@/Components/Atoms/Skeleton/Skeleton';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import Calendar from '@/Components/Molecules/Calendar/Calendar';
import CommentForm from '@/Components/Molecules/CommentForm/CommentForm';
import CommentList from '@/Components/Molecules/CommentList/CommentList';
import ConcurrentEditNotice from '@/Components/Molecules/ConcurrentEditNotice/ConcurrentEditNotice';
import EditableLabelList from '@/Components/Molecules/EditableLabelList/EditableLabelList';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import EditableSelect from '@/Components/Molecules/EditableSelect/EditableSelect';
import IssueCustomField from '@/Components/Molecules/IssueCustomField/IssueCustomField';
import Pagination from '@/Components/Molecules/Pagination/Pagination';
import PresenceStack from '@/Components/Molecules/PresenceStack/PresenceStack';
import SidebarField from '@/Components/Molecules/SidebarField/SidebarField';
import TabSelection, {
    tabIds,
} from '@/Components/Molecules/TabSelection/TabSelection';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import ActivityLogs from '@/Components/Organisms/ActivityLogs/ActivityLogs';
import IssueChildrenPanel from '@/Components/Organisms/IssueChildrenPanel/IssueChildrenPanel';
import IssueDevelopmentPanel from '@/Components/Organisms/IssueDevelopmentPanel/IssueDevelopmentPanel';
import IssuePageHeader from '@/Components/Organisms/IssuePageHeader/IssuePageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { useAlert } from '@/context/AlertContext';
import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { ProjectPrioritiesProvider } from '@/context/ProjectPrioritiesContext';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useIssueCommands } from '@/hooks/useIssueCommands';
import { useIssueLive } from '@/live/useIssueLive';
import { usePresence } from '@/live/usePresence';
import { IssuePageProps } from '@/types/Components';
import { Comment, Issue, IssueLabel } from '@/types/Issues';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import {
    ACTIVITY_PAGE_PARAM,
    ACTIVITY_PER_PAGE_PARAM,
} from '@/utils/activityLog';
import { cn } from '@/utils/cn';
import { retypeOptions } from '@/utils/issueTypes';
import { DURATION, EASE, rowIn } from '@/utils/motion';
import { formatDate } from '@/utils/time';
import { getReachableStatuses } from '@/utils/workflow';

// Module-level so an omitted prop keeps one identity across renders: the
// issue commands are memoized on these, and a fresh `[]` each render would
// re-register them in a loop.
const NO_LABELS: ProjectLabel[] = [];
const NO_ANCESTORS: Issue[] = [];
const NO_PRIORITIES: ProjectPriority[] = [];
const ACTIVITY_DEFAULT_PER_PAGE = 20;
const ACTIVITY_ONLY = ['activityLogs', 'queryParams'];

const tabPanelVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: {
        opacity: 1,
        y: 0,
        transition: { duration: DURATION.base, ease: EASE },
    },
};

/** Stands in for the activity feed while its deferred data is on the way. */
function ActivitySkeleton() {
    return (
        <div
            role="status"
            aria-label="Loading activity"
            className="flex flex-col gap-4"
        >
            {[0, 1, 2].map((index) => (
                <div key={index} className="flex gap-3">
                    <Skeleton index={index} className="h-7 w-7 rounded-full" />
                    <div className="flex flex-1 flex-col gap-2 pt-1">
                        <Skeleton index={index} className="h-3 w-1/3" />
                        <Skeleton index={index} className="h-3 w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function Show({
    project,
    projects,
    issue,
    users,
    labels = NO_LABELS,
    priorities = NO_PRIORITIES,
    issueTypes = [],
    ancestors = NO_ANCESTORS,
    linkedPullRequests = [],
    githubRepositories = [],
    githubDefaultBranchName = '',
    canCreateGithubDevelopment = false,
    githubAccountLinked = false,
    issueAbilities,
    projectRole = null,
    activityLogs,
    queryParams = null,
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

    const updateIssue = useCallback(
        (data: Record<string, FormDataConvertible>) => {
            router.patch(route('issues.update', issue.id), data, {
                preserveScroll: true,
            });
        },
        [issue.id],
    );

    useIssueCommands({
        project,
        issue,
        ancestors,
        users,
        labels,
        priorities,
        abilities: issueAbilities,
        update: updateIssue,
    });

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

    const currentStatusId = issue.workflowStatus?.id ?? null;
    const reachableStatuses = getReachableStatuses(issue);

    const workflowStatusOptions = reachableStatuses.map((status) => ({
        value: String(status.id),
        searchLabel: status.name,
        label: <WorkflowStatusBadge status={status} />,
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

    const parentIssue = ancestors[ancestors.length - 1];
    const issueTypeOptions = retypeOptions(
        issueTypes,
        issue.issueType,
        parentIssue
            ? { typeId: parentIssue.issue_type_id ?? parentIssue.issueType?.id }
            : null,
        projectRole,
    ).map((type) => ({
        value: String(type.id),
        searchLabel: type.name,
        label: <IssueTypeBadge issueType={type} />,
    }));

    const priorityOptions = [
        ...priorities.map((priority) => ({
            value: priority.name,
            label: (
                <div className="flex items-center gap-2">
                    <PriorityIcon priority={priority} tooltip={false} />
                    <span>{priority.name}</span>
                </div>
            ),
        })),
        {
            value: '',
            searchLabel: 'No priority',
            label: (
                <div className="flex items-center gap-2">
                    <PriorityIcon priority={null} tooltip={false} />
                    <span>No priority</span>
                </div>
            ),
        },
    ];

    const assigneeOptions = [
        {
            value: '',
            searchLabel: 'Unassigned',
            label: (
                <span className="flex items-center gap-2 text-(--text-gray-color)">
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

    type Tab = 'Comments' | 'Activity';

    const tabs: { name: Tab; count?: number }[] = [
        { name: 'Comments', count: issue.comments?.length ?? 0 },
        { name: 'Activity' },
    ];

    const [selectedTab, setSelectedTab] = useState<Tab>('Comments');
    const commentsIds = tabIds('issue-tabs', 'Comments');
    const activityIds = tabIds('issue-tabs', 'Activity');

    // The activity feed is not part of the page until it is asked for, and a
    // save answers with a full page that leaves it out again, so request it
    // whenever Activity is showing without it.
    const activityMissing = !activityLogs;

    useEffect(() => {
        if (selectedTab === 'Activity' && activityMissing) {
            router.reload({ only: ACTIVITY_ONLY });
        }
    }, [selectedTab, activityMissing]);

    // Other people's changes arrive live: only the props this page shows are
    // re-read, and the activity feed only while it is open.
    const relatedIds = useMemo(
        () => [
            ...ancestors.map((ancestor) => Number(ancestor.id)),
            ...(issue.children ?? []).map((child) => Number(child.id)),
        ],
        [ancestors, issue.children],
    );
    useIssueLive({
        projectId: project.id,
        issueId: Number(issue.id),
        related: relatedIds,
        activityVisible: selectedTab === 'Activity',
    });

    // Who else has the issue open, and who is editing the description. The
    // "editing" hints are whispers between browsers, never stored.
    const currentUserId = usePage().props.auth.user.id;
    const [descriptionEditors, setDescriptionEditors] = useState<Set<number>>(
        new Set(),
    );
    const editingDescription = useRef(false);
    const { others: viewers, whisper } = usePresence(
        `issue.${issue.id}`,
        currentUserId,
        (event, data) => {
            const userId = Number(data.userId);
            setDescriptionEditors((current) => {
                const next = new Set(current);
                if (event === 'editing') next.add(userId);
                else next.delete(userId);
                return next;
            });
        },
    );
    const announceEditing = useCallback(
        (editing: boolean) => {
            editingDescription.current = editing;
            whisper(editing ? 'editing' : 'stopped-editing', {
                userId: currentUserId,
            });
        },
        [whisper, currentUserId],
    );
    // Someone who joins while this person is editing missed the hint.
    useEffect(() => {
        if (editingDescription.current) announceEditing(true);
    }, [viewers.length, announceEditing]);
    const editorNames = viewers
        .filter((viewer) => descriptionEditors.has(viewer.id))
        .map((viewer) => viewer.name);

    return (
        <ProjectLabelsProvider labels={labels}>
            <ProjectPrioritiesProvider priorities={priorities}>
                <div className="flex h-screen w-screen overflow-hidden bg-(--bg-color)">
                    <Sidebar projects={projects} />
                    <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-(--bg-color-hover)">
                        <IssuePageHeader
                            project={project}
                            issue={issue}
                            ancestors={ancestors}
                            presence={<PresenceStack users={viewers} />}
                        />
                        <PageStage
                            as="main"
                            className="flex flex-1 flex-col overflow-y-auto"
                        >
                            <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[1fr_260px]">
                                <div className="flex min-w-0 flex-col gap-4">
                                    <PageSection className="flex flex-col gap-4">
                                        <EditableText
                                            as="h1"
                                            value={issue.title}
                                            onSave={(value) =>
                                                updateIssue({ title: value })
                                            }
                                            placeholder="Issue title"
                                            displayClassName="text-2xl font-semibold text-(--text-color)"
                                            inputClassName="text-2xl font-semibold"
                                        />

                                        <ConcurrentEditNotice
                                            names={editorNames}
                                            subject="description"
                                        />
                                        <EditableMarkdown
                                            onEditingChange={announceEditing}
                                            value={issue.description || ''}
                                            onSave={(value) =>
                                                updateIssue({
                                                    description: value,
                                                })
                                            }
                                            onImageUpload={uploadImage}
                                            users={users}
                                            projectId={project.id}
                                            placeholder="Add a description..."
                                        />
                                    </PageSection>

                                    {issue.issueType?.allowsChildren && (
                                        <PageSection>
                                            <IssueChildrenPanel
                                                project={project}
                                                issue={issue}
                                                issueTypes={issueTypes}
                                            />
                                        </PageSection>
                                    )}

                                    <PageSection className="mt-2 flex flex-col gap-3 border-t border-(--border-color) pt-4">
                                        <TabSelection
                                            tabs={tabs}
                                            selectedTab={selectedTab}
                                            idPrefix="issue-tabs"
                                            onSelectTab={setSelectedTab}
                                        />
                                        {/* Stays mounted while Activity is open so a half-written comment survives the switch. */}
                                        <motion.div
                                            role="tabpanel"
                                            id={commentsIds.panel}
                                            aria-labelledby={commentsIds.tab}
                                            hidden={selectedTab !== 'Comments'}
                                            variants={tabPanelVariants}
                                            initial={false}
                                            animate={
                                                selectedTab === 'Comments'
                                                    ? 'show'
                                                    : 'hidden'
                                            }
                                            className={cn(
                                                'flex flex-col gap-3',
                                                selectedTab !== 'Comments' &&
                                                    'hidden',
                                            )}
                                        >
                                            <CommentList
                                                comments={issue.comments || []}
                                                users={users}
                                                projectId={project.id}
                                                onEdit={editComment}
                                                onDelete={deleteComment}
                                                onImageUpload={uploadImage}
                                            />
                                            <CommentForm
                                                onSubmit={addComment}
                                                users={users}
                                                projectId={project.id}
                                                onImageUpload={uploadImage}
                                            />
                                        </motion.div>
                                        {selectedTab === 'Activity' && (
                                            <motion.div
                                                variants={tabPanelVariants}
                                                initial="hidden"
                                                animate="show"
                                                role="tabpanel"
                                                id={activityIds.panel}
                                                aria-labelledby={
                                                    activityIds.tab
                                                }
                                                aria-busy={!activityLogs}
                                                className="flex flex-col gap-3"
                                            >
                                                {!activityLogs && (
                                                    <ActivitySkeleton />
                                                )}
                                                {activityLogs && (
                                                    <>
                                                        <ActivityLogs
                                                            logs={
                                                                activityLogs.data
                                                            }
                                                            users={users}
                                                            issueTypes={
                                                                issueTypes
                                                            }
                                                        />
                                                        <Pagination
                                                            links={
                                                                activityLogs.links
                                                            }
                                                            from={
                                                                activityLogs.from
                                                            }
                                                            to={activityLogs.to}
                                                            total={
                                                                activityLogs.total
                                                            }
                                                            queryParams={
                                                                queryParams ??
                                                                {}
                                                            }
                                                            pageParam={
                                                                ACTIVITY_PAGE_PARAM
                                                            }
                                                            perPageParam={
                                                                ACTIVITY_PER_PAGE_PARAM
                                                            }
                                                            defaultPerPage={
                                                                ACTIVITY_DEFAULT_PER_PAGE
                                                            }
                                                            preserveState
                                                            only={ACTIVITY_ONLY}
                                                            className="border-t border-(--border-color) px-0 pb-0"
                                                        />
                                                    </>
                                                )}
                                            </motion.div>
                                        )}
                                    </PageSection>
                                </div>

                                <div className="sticky top-6 flex flex-col gap-3 self-start">
                                    {issueTypeOptions.length > 0 && (
                                        <SidebarField label="Type">
                                            <EditableSelect
                                                value={
                                                    issue.issueType
                                                        ? String(
                                                              issue.issueType
                                                                  .id,
                                                          )
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
                                                        <span className="text-sm text-(--text-gray-color)">
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
                                                        ? String(
                                                              currentStatusId,
                                                          )
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
                                                        <span className="text-sm text-(--text-gray-color)">
                                                            No status
                                                        </span>
                                                    )
                                                }
                                            />
                                        ) : issue.workflowStatus ? (
                                            <WorkflowStatusBadge
                                                status={issue.workflowStatus}
                                            />
                                        ) : (
                                            <span className="text-sm text-(--text-gray-color)">
                                                No status
                                            </span>
                                        )}
                                    </SidebarField>

                                    <SidebarField label="Priority">
                                        <EditableSelect
                                            value={issue.priority ?? ''}
                                            options={priorityOptions}
                                            header="Change priority to..."
                                            onSave={(value) =>
                                                updateIssue({
                                                    priority: value || null,
                                                })
                                            }
                                            renderValue={() => (
                                                <div className="flex items-center gap-2">
                                                    <PriorityIcon
                                                        priority={
                                                            issue.priorityDetails
                                                        }
                                                        tooltip={false}
                                                    />
                                                    <span className="text-sm text-(--text-color)">
                                                        {issue.priority ??
                                                            'No priority'}
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
                                                            issue.assignee
                                                                .avatar
                                                        }
                                                        name={
                                                            issue.assignee.name
                                                        }
                                                        size="sm"
                                                        showTooltip={false}
                                                    />
                                                ) : (
                                                    <span className="flex items-center gap-2 text-(--text-gray-color)">
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
                                                    customFieldValues[
                                                        field.id
                                                    ] ?? null
                                                }
                                                onSave={(value) =>
                                                    saveCustomField(
                                                        field.id,
                                                        value,
                                                    )
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
                                            maxDisplay={'auto'}
                                        />
                                    </SidebarField>

                                    <SidebarField label="Project">
                                        <Link
                                            href={route(
                                                'projects.show',
                                                project.id,
                                            )}
                                            className="flex items-center gap-2 rounded-full px-1.5 py-1 text-sm text-(--text-color) hover:bg-(--bg-light-color)"
                                        >
                                            <Icon name="FolderGit2" size={14} />
                                            {project.name}
                                        </Link>
                                    </SidebarField>

                                    {(linkedPullRequests.length > 0 ||
                                        githubRepositories.length > 0) && (
                                        <SidebarField label="Development">
                                            <IssueDevelopmentPanel
                                                pullRequests={
                                                    linkedPullRequests
                                                }
                                                repositories={
                                                    githubRepositories
                                                }
                                                defaultBranchName={
                                                    githubDefaultBranchName
                                                }
                                                onCreateBranch={
                                                    canCreateGithubDevelopment &&
                                                    githubAccountLinked
                                                        ? createGithubBranch
                                                        : undefined
                                                }
                                                onCreatePullRequest={
                                                    canCreateGithubDevelopment &&
                                                    githubAccountLinked
                                                        ? createGithubPullRequest
                                                        : undefined
                                                }
                                                requiresGithubAccountLink={
                                                    canCreateGithubDevelopment &&
                                                    !githubAccountLinked
                                                }
                                            />
                                        </SidebarField>
                                    )}

                                    <SidebarField label="Dates">
                                        <div className="flex items-center gap-1">
                                            <Icon
                                                name="Calendar"
                                                size={14}
                                                className="mr-1 text-(--text-gray-color)"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowStartDate(true);
                                                    setShowEndDate(false);
                                                }}
                                                className="rounded-full px-1.5 py-1 text-xs text-(--text-color) hover:bg-(--bg-light-color)"
                                            >
                                                {issue.start_date ||
                                                    'Start date'}
                                            </button>
                                            <span className="text-xs text-(--text-gray-color)">
                                                —
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowEndDate(true);
                                                    setShowStartDate(false);
                                                }}
                                                className="rounded-full px-1.5 py-1 text-xs text-(--text-color) hover:bg-(--bg-light-color)"
                                            >
                                                {issue.end_date || 'End date'}
                                            </button>
                                        </div>
                                    </SidebarField>

                                    <motion.div
                                        variants={rowIn}
                                        className="mt-auto flex flex-col gap-2 border-t border-(--border-color) pt-4"
                                    >
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-medium tracking-wider text-(--text-gray-color) uppercase">
                                                Created
                                            </span>
                                            <span className="text-xs text-(--text-gray-color)">
                                                {formatDate(issue.created_at)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-medium tracking-wider text-(--text-gray-color) uppercase">
                                                Modified
                                            </span>
                                            <span className="text-xs text-(--text-gray-color)">
                                                {formatDate(issue.updated_at)}
                                            </span>
                                        </div>
                                    </motion.div>
                                </div>
                            </div>
                        </PageStage>
                    </div>
                    <AnimatePresence>
                        {(showStartDate || showEndDate) && (
                            <motion.div
                                key="date-overlay"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: DURATION.fast }}
                                className="fixed inset-0 z-100 flex items-center justify-center bg-(--overlay-color) backdrop-blur-[2px]"
                                onClick={() => {
                                    setShowStartDate(false);
                                    setShowEndDate(false);
                                }}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.97 }}
                                    transition={{
                                        duration: DURATION.base,
                                        ease: EASE,
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {showStartDate && (
                                        <Calendar
                                            selectedDate={parseDate(
                                                issue.start_date,
                                            )}
                                            onSelect={(date) => {
                                                const newStartDate =
                                                    toLocalDateString(date);
                                                updateIssue({
                                                    start_date: newStartDate,
                                                    ...(issue.end_date &&
                                                    issue.end_date <
                                                        newStartDate
                                                        ? {
                                                              end_date:
                                                                  newStartDate,
                                                          }
                                                        : {}),
                                                });
                                                setShowStartDate(false);
                                            }}
                                            onClose={() =>
                                                setShowStartDate(false)
                                            }
                                        />
                                    )}
                                    {showEndDate && (
                                        <Calendar
                                            selectedDate={parseDate(
                                                issue.end_date,
                                            )}
                                            minDate={parseDate(
                                                issue.start_date,
                                            )}
                                            rangeStart={parseDate(
                                                issue.start_date,
                                            )}
                                            onSelect={(date) => {
                                                updateIssue({
                                                    end_date:
                                                        toLocalDateString(date),
                                                });
                                                setShowEndDate(false);
                                            }}
                                            onClose={() =>
                                                setShowEndDate(false)
                                            }
                                        />
                                    )}
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </ProjectPrioritiesProvider>
        </ProjectLabelsProvider>
    );
}
