import {
    forwardRef,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import EditableLabelList from '@/Components/Molecules/EditableLabelList/EditableLabelList';
import {
    AssigneePicker,
    DatePicker,
    PriorityPicker,
    StatusPicker,
} from '@/Components/Molecules/IssuePropertyPickers/IssuePropertyPickers';
import { useProjectPriorities } from '@/context/ProjectPrioritiesContext';
import { DropdownOptionItem } from '@/types/Dropdown';
import { IssueLabel } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { AssignableUser } from '@/types/Users';
import { WorkflowStatus } from '@/types/Workflow';
import { cn } from '@/utils/cn';

export interface QuickAddIssueRowHandle {
    open: () => void;
}

const cellBase =
    'px-3 py-2 border-b border-[var(--border-color)] align-middle text-[12px] font-normal';

/**
 * What the row sends on top of the title and type. A field the user never
 * touched is left out, so the server's own defaults (starting status, project
 * default priority, type template) still apply.
 */
export interface QuickAddIssueValues {
    workflow_status_id?: number;
    priority?: string | null;
    assignee_id?: number | null;
    labels?: IssueLabel[];
    start_date?: string;
    end_date?: string;
}

/**
 * The status to keep when the type changes. A status belongs to one type's
 * workflow, so the old one is gone: prefer the new type's status of the same
 * category (the first, which is the initial one when that category has it),
 * and otherwise drop the choice so the type's initial status applies.
 */
export const fallbackStatus = (
    chosen: WorkflowStatus | null,
    type: IssueType | null,
): WorkflowStatus | null => {
    if (!chosen || !type?.statuses) return null;

    const statuses = type.statuses;

    return (
        statuses.find((status) => status.id === chosen.id) ??
        statuses.find(
            (status) => status.category === chosen.category && status.isInitial,
        ) ??
        statuses.find((status) => status.category === chosen.category) ??
        null
    );
};

const mutedCell = (
    <span className="text-[var(--text-muted-color)]">&mdash;</span>
);

interface QuickAddIssueRowProps {
    colSpan: number;
    enabledColumns: Record<string, boolean>;
    issueTypes: IssueType[];
    users?: AssignableUser[];
    /**
     * Returning a promise keeps the draft until it settles and drops it only
     * when it resolves to true, so a rejected create does not cost the user
     * their title and choices. Anything else is treated as accepted.
     */
    onSubmit: (
        title: string,
        issueTypeId: number | null,
        values: QuickAddIssueValues,
    ) => void | Promise<boolean>;
    isSubmitting?: boolean;
    label?: string;
    indent?: number;
    nextIssueId?: number | null;
}

/**
 * Jira-style inline "quick add": collapsed to a plain "+ New issue" link by
 * default, expands into a real-looking table row (matching ListRow's cell
 * layout) with only the title and every property cell editable. Status choices
 * follow the selected type (falling back when the type changes), and a
 * property left alone previews the default the issue will be created with.
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
            users = [],
            onSubmit,
            isSubmitting = false,
            label = 'New issue',
            indent = 0,
            nextIssueId = null,
        },
        ref,
    ) => {
        const { priorities, defaultPriority } = useProjectPriorities();
        const [isEditing, setIsEditing] = useState(false);
        const [title, setTitle] = useState('');
        const defaultTypeId =
            issueTypes.find((type) => type.name === 'Task')?.id ??
            issueTypes[0]?.id ??
            null;
        const [issueTypeId, setIssueTypeId] = useState<number | null>(
            defaultTypeId,
        );
        const [chosenStatus, setChosenStatus] = useState<WorkflowStatus | null>(
            null,
        );
        const [priorityName, setPriorityName] = useState<
            string | null | undefined
        >(undefined);
        const [assigneeId, setAssigneeId] = useState<number | null>(null);
        const [labels, setLabels] = useState<IssueLabel[]>([]);
        // Clearing the labels is a choice too: it has to override the labels
        // the type's template would otherwise add.
        const [labelsTouched, setLabelsTouched] = useState(false);
        const [startDate, setStartDate] = useState('');
        const [endDate, setEndDate] = useState('');
        const inputRef = useRef<HTMLInputElement>(null);

        const resetValues = () => {
            setChosenStatus(null);
            setPriorityName(undefined);
            setAssigneeId(null);
            setLabels([]);
            setLabelsTouched(false);
            setStartDate('');
            setEndDate('');
        };

        const selectedType =
            issueTypes.find((type) => type.id === issueTypeId) ?? null;
        const initialStatus =
            selectedType?.statuses?.find((status) => status.isInitial) ??
            selectedType?.statuses?.[0] ??
            null;
        const shownStatus = chosenStatus ?? initialStatus;
        const assignee = users.find((user) => user.id === assigneeId) ?? null;
        const shownPriority =
            priorityName === undefined
                ? defaultPriority
                : (priorities.find(
                      (priority) =>
                          priority.name.toLowerCase() ===
                          priorityName?.toLowerCase(),
                  ) ?? null);

        const changeType = (value: string) => {
            const nextId = Number(value);
            const nextType =
                issueTypes.find((type) => type.id === nextId) ?? null;

            setIssueTypeId(nextId);
            setChosenStatus((current) => fallbackStatus(current, nextType));
        };

        // Rows are the same badges the list shows, so a type looks identical
        // wherever it appears.
        const typeOptions = useMemo(
            (): DropdownOptionItem[] =>
                issueTypes.map((type) => ({
                    value: String(type.id),
                    label: <IssueTypeBadge issueType={type} />,
                    searchLabel: type.name,
                })),
            [issueTypes],
        );

        const reveal = () => {
            setIsEditing(true);
            setIssueTypeId(defaultTypeId);
            resetValues();
            requestAnimationFrame(() => inputRef.current?.focus());
        };

        useImperativeHandle(ref, () => ({ open: reveal }));

        const submit = () => {
            const trimmed = title.trim();
            if (!trimmed) return;
            const result = onSubmit(trimmed, issueTypeId, {
                ...(chosenStatus
                    ? { workflow_status_id: chosenStatus.id }
                    : {}),
                ...(priorityName !== undefined
                    ? { priority: priorityName }
                    : {}),
                ...(assigneeId !== null ? { assignee_id: assigneeId } : {}),
                ...(labelsTouched ? { labels } : {}),
                ...(startDate ? { start_date: startDate } : {}),
                ...(endDate ? { end_date: endDate } : {}),
            });
            const clearDraft = () => {
                setTitle('');
                resetValues();
            };

            if (result instanceof Promise) {
                void result.then((accepted) => {
                    if (accepted) clearDraft();
                });
            } else {
                clearDraft();
            }
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
                    <td
                        className={cn(cellBase, 'truncate')}
                        style={{ paddingLeft }}
                    >
                        <input
                            ref={inputRef}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSubmitting}
                            placeholder="What needs to be done?"
                            className="w-full min-w-[160px] rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-1 text-xs text-[var(--text-color)] outline-none focus:border-[var(--accent-color)] focus-visible:ring-2 focus-visible:ring-[var(--accent-color)] disabled:opacity-60"
                        />
                    </td>
                )}
                {enabledColumns.type && (
                    <td className={cellBase}>
                        {issueTypes.length > 0 ? (
                            <Dropdown
                                variant="select"
                                title="Issue type"
                                ariaLabel="Issue type"
                                options={typeOptions}
                                disabled={isSubmitting}
                                selectedValues={
                                    issueTypeId !== null
                                        ? [String(issueTypeId)]
                                        : []
                                }
                                onSelect={changeType}
                                trigger={
                                    <button
                                        type="button"
                                        aria-label="Issue type"
                                        disabled={isSubmitting}
                                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border-none bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                                    >
                                        {selectedType ? (
                                            <IssueTypeBadge
                                                issueType={selectedType}
                                            />
                                        ) : (
                                            <span className="text-xs text-[var(--text-muted-color)]">
                                                Type
                                            </span>
                                        )}
                                        <Icon
                                            name="ChevronDown"
                                            size={12}
                                            className="text-[var(--text-muted-color)]"
                                        />
                                    </button>
                                }
                            />
                        ) : (
                            mutedCell
                        )}
                    </td>
                )}
                {enabledColumns.status && (
                    <td className={cellBase}>
                        <StatusPicker
                            statuses={selectedType?.statuses ?? []}
                            value={shownStatus}
                            onChange={setChosenStatus}
                            disabled={isSubmitting}
                        />
                    </td>
                )}
                {enabledColumns.assignee && (
                    <td className={cellBase}>
                        <AssigneePicker
                            users={users}
                            value={assignee}
                            selectedId={assigneeId}
                            onChange={setAssigneeId}
                            disabled={isSubmitting}
                        />
                    </td>
                )}
                {enabledColumns.priority && (
                    <td className={cellBase}>
                        <PriorityPicker
                            priorities={priorities}
                            value={shownPriority}
                            onChange={setPriorityName}
                            disabled={isSubmitting}
                        />
                    </td>
                )}
                {enabledColumns.labels && (
                    <td className={cellBase}>
                        <EditableLabelList
                            labels={labels}
                            onSave={(next) => {
                                setLabels(next);
                                setLabelsTouched(true);
                            }}
                            maxDisplay="auto"
                            disabled={isSubmitting}
                        />
                    </td>
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
                    <td className={cellBase}>
                        <DatePicker
                            label="Start date"
                            value={startDate}
                            disabled={isSubmitting}
                            onChange={(next) => {
                                setStartDate(next);
                                // An end before the new start moves with it.
                                if (endDate && endDate < next) {
                                    setEndDate(next);
                                }
                            }}
                        />
                    </td>
                )}
                {enabledColumns.end_date && (
                    <td className={cellBase}>
                        <DatePicker
                            label="End date"
                            value={endDate}
                            minDate={startDate}
                            disabled={isSubmitting}
                            onChange={setEndDate}
                        />
                    </td>
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
