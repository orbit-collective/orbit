import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { Issue } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { Project } from '@/types/Projects';
import { Link, router } from '@inertiajs/react';
import { useRef, useState, type KeyboardEvent } from 'react';

interface IssueChildrenPanelProps {
    project: Project;
    issue: Issue;
    issueTypes: IssueType[];
}

/**
 * The sub-issue list on an issue's detail view, plus the inline row that
 * creates one. Only rendered for a type whose allows_children flag is on -
 * the same gate IssueService::assertValidParent() enforces server-side.
 */
export default function IssueChildrenPanel({
    project,
    issue,
    issueTypes,
}: IssueChildrenPanelProps) {
    const children = issue.children ?? [];
    const allowedIds = issue.issueType?.allowedChildTypeIds ?? [];

    // An empty allowed set means "unrestricted" on the backend, so mirror
    // that here rather than offering an empty picker.
    const selectableTypes =
        allowedIds.length > 0
            ? issueTypes.filter((type) => allowedIds.includes(type.id))
            : issueTypes;

    const defaultTypeId =
        selectableTypes.find((type) => type.name === 'Task')?.id ??
        selectableTypes[0]?.id ??
        null;

    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [issueTypeId, setIssueTypeId] = useState<number | null>(
        defaultTypeId,
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const open = () => {
        setIsAdding(true);
        setIssueTypeId(defaultTypeId);
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const cancel = () => {
        setTitle('');
        setIsAdding(false);
    };

    const submit = () => {
        const trimmed = title.trim();
        if (!trimmed) return;

        setIsSubmitting(true);
        router.post(
            route('issues.store'),
            {
                title: trimmed,
                project_id: project.id,
                priority: 'medium',
                status: 'open',
                parent_id: issue.id,
                ...(issueTypeId ? { issue_type_id: issueTypeId } : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => setTitle(''),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') submit();
        else if (e.key === 'Escape') cancel();
    };

    return (
        <section className="mt-2 flex flex-col gap-3 border-t border-[var(--border-color)] pt-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-color)]">
                    Sub-issues
                    {children.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-[var(--text-gray-color)]">
                            {children.length}
                        </span>
                    )}
                </span>
                {!isAdding && (
                    <button
                        type="button"
                        onClick={open}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1 text-xs font-medium text-[var(--text-muted-color)] transition-colors hover:bg-[var(--bg-light-color)] hover:text-[var(--text-color)]"
                    >
                        <Icon name="Plus" size={13} />
                        Add sub-issue
                    </button>
                )}
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-color)]">
                {children.length === 0 && !isAdding && (
                    <p className="px-3 py-4 text-xs text-[var(--text-gray-color)]">
                        No sub-issues yet. Break this one down into smaller
                        pieces.
                    </p>
                )}

                {children.map((child) => (
                    <Link
                        key={child.id}
                        href={route('issues.show', [project.id, child.id])}
                        className="flex items-center gap-3 border-b border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-color)] transition-colors last:border-b-0 hover:bg-[var(--bg-light-color)]"
                    >
                        <span className="w-10 shrink-0 font-mono text-[11px] text-[var(--text-muted-color)]">
                            #{child.id}
                        </span>
                        {child.issueType && (
                            <IssueTypeBadge issueType={child.issueType} />
                        )}
                        <span className="min-w-0 flex-1 truncate">
                            {child.title}
                        </span>
                        {child.workflowStatus && (
                            <WorkflowStatusBadge
                                status={child.workflowStatus}
                            />
                        )}
                        {child.assignee && (
                            <UserBadge
                                avatarSrc={child.assignee.avatar}
                                name={child.assignee.name}
                                size="sm"
                                showTooltip={false}
                            />
                        )}
                    </Link>
                ))}

                {isAdding && (
                    <div className="flex items-center gap-2 border-t border-[var(--border-color)] px-3 py-2">
                        <input
                            ref={inputRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            placeholder="What needs to be done?"
                            className="min-w-0 flex-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1 text-xs text-[var(--text-color)] outline-none focus:border-[var(--accent-color)] disabled:opacity-60"
                        />
                        {selectableTypes.length > 0 && (
                            <InlineSelectDropdown
                                label="Issue type"
                                placeholder="Type"
                                subtle
                                options={selectableTypes.map((type) => ({
                                    value: String(type.id),
                                    label: type.name,
                                    icon: type.icon,
                                    color: type.color,
                                }))}
                                value={
                                    issueTypeId !== null
                                        ? String(issueTypeId)
                                        : null
                                }
                                onChange={(value) =>
                                    setIssueTypeId(value ? Number(value) : null)
                                }
                            />
                        )}
                        <button
                            type="button"
                            title="Cancel"
                            onClick={cancel}
                            className="rounded p-1 text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                        >
                            <Icon name="X" size={13} />
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
