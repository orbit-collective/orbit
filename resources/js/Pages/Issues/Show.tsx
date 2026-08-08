import EditableSelect from '@/Components/Atoms/EditableSelect/EditableSelect';
import EditableText from '@/Components/Atoms/EditableText/EditableText';
import Icon from '@/Components/Atoms/Icon/Icon';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import { StatusIcon } from '@/Components/Atoms/StatusIcon/StatusIcon';
import Calendar from '@/Components/Molecules/Calendar/Calendar';
import CommentForm from '@/Components/Molecules/CommentForm/CommentForm';
import CommentList from '@/Components/Molecules/CommentList/CommentList';
import EditableLabelList from '@/Components/Molecules/EditableLabelList/EditableLabelList';
import EditableMarkdown from '@/Components/Molecules/EditableMarkdown/EditableMarkdown';
import SidebarField from '@/Components/Molecules/SidebarField/SidebarField';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import IssuePageHeader from '@/Components/Organisms/IssuePageHeader/IssuePageHeader';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import { PageProps } from '@/types';
import { IssuePageProps } from '@/types/Components';
import { Comment, IssueLabel, IssuePriority, Status } from '@/types/Issues';
import { formatStatusLabel } from '@/utils/text';
import { formatDate } from '@/utils/time';
import type { FormDataConvertible } from '@inertiajs/core';
import { Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const STATUSES: Status[] = ['open', 'in_progress', 'closed'];
const PRIORITIES: IssuePriority[] = ['high', 'medium', 'low'];

export default function Show({
    project,
    projects,
    issue,
    users,
}: IssuePageProps) {
    const {
        props: { auth },
    } = usePage<PageProps>();
    const [showStartDate, setShowStartDate] = useState(false);
    const [showEndDate, setShowEndDate] = useState(false);

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

    const addComment = (body: string) => {
        router.post(
            route('comments.store', issue.id),
            { body },
            { preserveScroll: true },
        );
    };

    const deleteComment = (comment: Comment) => {
        router.delete(route('comments.destroy', comment.id), {
            preserveScroll: true,
        });
    };

    const statusOptions = STATUSES.map((status) => ({
        value: status,
        label: (
            <div className="flex items-center gap-2">
                <StatusIcon status={status} tooltip={false} />
                <span className="capitalize">{formatStatusLabel(status)}</span>
            </div>
        ),
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
            label: (
                <span className="flex items-center gap-2 text-[var(--text-gray-color)]">
                    <Icon name="UserX" size={14} />
                    Unassigned
                </span>
            ),
        },
        ...users.map((user) => ({
            value: String(user.id),
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
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />
            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                <IssuePageHeader project={project} issue={issue} />
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
                                placeholder="Add a description..."
                            />

                            <div className="mt-2 flex flex-col gap-3 border-t border-[var(--border-color)] pt-4">
                                <span className="text-sm font-medium text-[var(--text-color)]">
                                    Activity
                                </span>
                                <CommentList
                                    comments={issue.comments || []}
                                    currentUserId={auth.user.id}
                                    onDelete={deleteComment}
                                />
                                <CommentForm onSubmit={addComment} />
                            </div>
                        </div>

                        <div className="sticky top-6 flex flex-col gap-3 self-start">
                            <SidebarField label="Status">
                                <EditableSelect
                                    value={issue.status}
                                    options={statusOptions}
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
                                                {formatStatusLabel(value)}
                                            </span>
                                        </div>
                                    )}
                                />
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
                                                <Icon name="UserX" size={14} />
                                                Unassigned
                                            </span>
                                        )
                                    }
                                />
                            </SidebarField>

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
                                    href={route('projects.show', project.id)}
                                    className="flex items-center gap-2 rounded-full px-1.5 py-1 text-sm text-[var(--text-color)] hover:bg-[var(--bg-light-color)]"
                                >
                                    <Icon name="FolderGit2" size={14} />
                                    {project.name}
                                </Link>
                            </SidebarField>

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
    );
}
