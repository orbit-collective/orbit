import { Link, router } from '@inertiajs/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRef, useState, type KeyboardEvent } from 'react';
import AnimatedNumber from '@/Components/Atoms/AnimatedNumber/AnimatedNumber';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { useAlert } from '@/context/AlertContext';
import { Issue } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { Project } from '@/types/Projects';

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
    const { addAlert } = useAlert();
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
                parent_id: issue.id,
                ...(issueTypeId ? { issue_type_id: issueTypeId } : {}),
            },
            {
                preserveScroll: true,
                onSuccess: () => setTitle(''),
                onError: (errors) =>
                    addAlert(
                        Object.values(errors)[0] ??
                            'Could not create the sub-issue',
                        'error',
                    ),
                onFinish: () => setIsSubmitting(false),
            },
        );
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') submit();
        else if (e.key === 'Escape') cancel();
    };

    return (
        <section className="mt-2 flex flex-col gap-3 border-t border-(--border-color) pt-4">
            <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-(--text-color)">
                    Sub-issues
                    {children.length > 0 && (
                        <span className="ml-1.5 text-xs font-normal text-(--text-gray-color)">
                            <AnimatedNumber value={children.length} />
                        </span>
                    )}
                </span>
                {!isAdding && (
                    <button
                        type="button"
                        onClick={open}
                        className="flex cursor-pointer items-center gap-1.5 rounded-md border-none bg-transparent px-2 py-1 text-xs font-medium text-(--text-muted-color) transition-colors hover:bg-(--bg-light-color) hover:text-(--text-color)"
                    >
                        <Icon name="Plus" size={13} />
                        Add sub-issue
                    </button>
                )}
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-(--border-color)">
                {children.length === 0 && !isAdding && (
                    <p className="px-3 py-4 text-xs text-(--text-gray-color)">
                        No sub-issues yet. Break this one down into smaller
                        pieces.
                    </p>
                )}

                {children.map((child, index) => (
                    <RowReveal
                        key={child.id}
                        index={index}
                        className="border-b border-(--border-color) last:border-b-0"
                    >
                        <Link
                            href={route('issues.show', [project.id, child.id])}
                            className="flex items-center gap-3 px-3 py-2 text-xs text-(--text-color) transition-colors hover:bg-(--bg-light-color)"
                        >
                            <span className="w-10 shrink-0 font-mono text-[11px] text-(--text-muted-color)">
                                #{child.number ?? child.id}
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
                    </RowReveal>
                ))}

                <AnimatePresence initial={false}>
                    {isAdding && (
                        <motion.div
                            key="add-row"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{
                                duration: 0.3,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            className="flex items-center gap-2 overflow-hidden border-t border-(--border-color) px-3 py-2"
                        >
                            <input
                                ref={inputRef}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isSubmitting}
                                placeholder="What needs to be done?"
                                className="min-w-0 flex-1 rounded-md border border-(--border-color) bg-(--bg-color) px-2 py-1 text-xs text-(--text-color) outline-hidden focus:border-(--accent-color) disabled:opacity-60"
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
                                        setIssueTypeId(
                                            value ? Number(value) : null,
                                        )
                                    }
                                />
                            )}
                            <button
                                type="button"
                                title="Cancel"
                                onClick={cancel}
                                className="rounded-sm p-1 text-(--text-muted-color) transition-colors hover:text-(--text-color)"
                            >
                                <Icon name="X" size={13} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
}
