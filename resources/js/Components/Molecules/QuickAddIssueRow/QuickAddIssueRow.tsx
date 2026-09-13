import Icon from '@/Components/Atoms/Icon/Icon';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import { IssueType } from '@/types/IssueTypes';
import { cn } from '@/utils/cn';
import {
    forwardRef,
    useImperativeHandle,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';

export interface QuickAddIssueRowHandle {
    open: () => void;
}

const cellBase =
    'px-3 py-2 border-b border-[var(--border-color)] align-middle text-[12px] font-normal';

const mutedCell = (
    <span className="text-[var(--text-muted-color)]">&mdash;</span>
);

interface QuickAddIssueRowProps {
    colSpan: number;
    enabledColumns: Record<string, boolean>;
    issueTypes: IssueType[];
    onSubmit: (title: string, issueTypeId: number | null) => void;
    isSubmitting?: boolean;
    label?: string;
    indent?: number;
    nextIssueId?: number | null;
}

/**
 * Jira-style inline "quick add": collapsed to a plain "+ New issue" link by
 * default, expands into a real-looking table row (matching ListRow's cell
 * layout) with only the title and issue type editable - the other cells
 * preview the defaults the issue will be created with, and are filled in
 * afterwards from the issue detail view, which is unchanged.
 */
export const QuickAddIssueRow = forwardRef<
    QuickAddIssueRowHandle,
    QuickAddIssueRowProps
>(
    (
        {
            colSpan,
            enabledColumns,
            issueTypes,
            onSubmit,
            isSubmitting = false,
            label = 'New issue',
            indent = 0,
            nextIssueId = null,
        },
        ref,
    ) => {
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const defaultTypeId =
            issueTypes.find((type) => type.name === 'Task')?.id ??
            issueTypes[0]?.id ??
            null;
        const [issueTypeId, setIssueTypeId] = useState<number | null>(
            defaultTypeId,
        );
        const inputRef = useRef<HTMLInputElement>(null);

        const selectedType =
            issueTypes.find((type) => type.id === issueTypeId) ?? null;
        const initialStatus =
            selectedType?.statuses?.find((status) => status.isInitial) ??
            selectedType?.statuses?.[0] ??
            null;

        const reveal = () => {
            setIsEditing(true);
            setIssueTypeId(defaultTypeId);
            requestAnimationFrame(() => inputRef.current?.focus());
        };

        useImperativeHandle(ref, () => ({ open: reveal }));

        const submit = () => {
            const trimmed = title.trim();
            if (!trimmed) return;
            onSubmit(trimmed, issueTypeId);
            setTitle('');
        };

        const cancel = () => {
            setTitle('');
            setIsEditing(false);
        };

        const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
                submit();
            } else if (e.key === 'Escape') {
                cancel();
            }
        };

        const paddingLeft = 16 + indent * 20;

        if (!isEditing) {
            return (
                <tr>
                    <td
                        colSpan={colSpan}
                        className="border-b border-[var(--border-color)] px-3 py-2"
                        style={{ paddingLeft }}
                    >
                        <button
                            type="button"
                            onClick={reveal}
                            className="flex cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-xs font-medium text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                        >
                            <Icon name="Plus" size={13} />
                            {label}
                        </button>
                    </td>
                </tr>
            );
        }

        return (
            <tr className="bg-[var(--accent-color-opacity)]">
                <td className={cn(cellBase, 'w-[48px] px-2 text-center')}>
                    <span className="inline-block h-3.5 w-3.5 rounded border border-[var(--border-color-strong)] opacity-40" />
                </td>
                {enabledColumns.id && (
                    <td
                        className={cn(
                            cellBase,
                            'w-[75px] font-mono text-[11px] text-[var(--text-muted-color)]',
                        )}
                    >
                        {nextIssueId !== null ? `#${nextIssueId}` : mutedCell}
                    </td>
                )}
                {enabledColumns.title && (
                    <td className={cn(cellBase, 'truncate')}>
                        <input
                            ref={inputRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            placeholder="What needs to be done?"
                            style={{ marginLeft: paddingLeft - 12 }}
                            className="w-full min-w-[160px] rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1 text-xs text-[var(--text-color)] outline-none focus:border-[var(--accent-color)] disabled:opacity-60"
                        />
                    </td>
                )}
                {enabledColumns.type && (
                    <td className={cellBase}>
                        {issueTypes.length > 0 ? (
                            <InlineSelectDropdown
                                label="Issue type"
                                placeholder="Type"
                                options={issueTypes.map((type) => ({
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
                        ) : (
                            mutedCell
                        )}
                    </td>
                )}
                {enabledColumns.status && (
                    <td className={cellBase}>
                        {initialStatus ? (
                            <WorkflowStatusBadge status={initialStatus} />
                        ) : (
                            mutedCell
                        )}
                    </td>
                )}
                {enabledColumns.assignee && (
                    <td className={cellBase}>
                        <span className="flex items-center gap-1.5 text-[var(--text-muted-color)]">
                            <Icon name="UserX" size={13} />
                            Unassigned
                        </span>
                    </td>
                )}
                {enabledColumns.priority && (
                    <td className={cellBase}>
                        <span className="flex items-center gap-1.5 text-[var(--text-color)]">
                            <PriorityIcon priority="medium" tooltip={false} />
                            Medium
                        </span>
                    </td>
                )}
                {enabledColumns.labels && (
                    <td className={cellBase}>{mutedCell}</td>
                )}
                {enabledColumns.updated && (
                    <td
                        className={cn(
                            cellBase,
                            'text-[var(--text-muted-color)]',
                        )}
                    >
                        Just now
                    </td>
                )}
                {enabledColumns.start_date && (
                    <td className={cellBase}>{mutedCell}</td>
                )}
                {enabledColumns.end_date && (
                    <td className={cellBase}>{mutedCell}</td>
                )}
                <td className={cellBase} aria-hidden="true" />
                <td className={cn(cellBase, 'w-[50px] text-right')}>
                    <button
                        type="button"
                        title="Cancel"
                        onClick={cancel}
                        className="rounded p-1 text-[var(--text-muted-color)] transition-colors hover:text-[var(--text-color)]"
                    >
                        <Icon name="X" size={13} />
                    </button>
                </td>
            </tr>
        );
    },
);

QuickAddIssueRow.displayName = 'QuickAddIssueRow';

export default QuickAddIssueRow;
