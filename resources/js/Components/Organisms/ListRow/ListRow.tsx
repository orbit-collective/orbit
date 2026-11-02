import React, { useRef, useState } from 'react';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import EditableLabelList from '@/Components/Molecules/EditableLabelList/EditableLabelList';
import {
    AssigneePicker,
    DatePicker,
    PriorityPicker,
    REVEAL_ON_ROW_HOVER,
    StatusPicker,
} from '@/Components/Molecules/IssuePropertyPickers/IssuePropertyPickers';
import LabelList from '@/Components/Molecules/LabelList/LabelList';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { useProjectPriorities } from '@/context/ProjectPrioritiesContext';
import { ListRowProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { cn } from '@/utils/cn';
import { DEFAULT_ENABLED_COLUMNS } from '@/utils/issueTableColumns';
import { formatTimeAgo } from '@/utils/time';
import { getReachableStatuses } from '@/utils/workflow';

const rowMenuOptions = (removeDisabled: boolean): DropdownOptionItem[] => [
    { value: 'open', label: 'Open issue', icon: 'Maximize2' },
    {
        value: 'remove',
        label: 'Remove',
        icon: 'Trash',
        disabled: removeDisabled,
    },
];

/**
 * An editable cell sits inside a clickable row, and its pickers portal their
 * menus out of it - React still bubbles those clicks up to the row, which
 * would open the issue, so they are stopped here.
 */
const Editable = ({ children }: { children: React.ReactNode }) => (
    <div
        className="inline-flex max-w-full items-center"
        onClick={(e) => e.stopPropagation()}
    >
        {children}
    </div>
);

const cellBase =
    'px-3 py-2 border-b border-[var(--border-color)] align-middle text-[12px] font-normal';

export const ListRow = ({
    issue,
    onClick,
    onRemove,
    isClosed,
    handleSelectIssueCheckbox,
    enabledColumns = DEFAULT_ENABLED_COLUMNS,
    rowHeight = 36,
    depth = 0,
    hasChildren = false,
    isCollapsed = false,
    onToggleCollapse,
    editing,
}: ListRowProps) => {
    const { priorities } = useProjectPriorities();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Set while the menu was opened by right-click, so it opens at the cursor.
    const [menuAnchor, setMenuAnchor] = useState<{
        x: number;
        y: number;
    } | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuAnchor({ x: e.clientX, y: e.clientY });
        setIsMenuOpen(true);
    };

    const handleMenuOpenChange = (open: boolean) => {
        setIsMenuOpen(open);
        if (!open) setMenuAnchor(null);
    };

    const handleMenuSelect = (action: string) => {
        if (action === 'open') {
            onClick();
        } else if (action === 'remove') {
            onRemove?.();
        }
    };

    const handleRowClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement;
        if (
            target.closest('[data-column="checkbox"]') ||
            target.closest('[data-column="actions"]')
        ) {
            return;
        }
        onClick();
    };

    const can = editing?.abilities;
    const save = (data: Record<string, unknown>) =>
        editing?.onUpdate(issue, data);

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleDraft, setTitleDraft] = useState(issue.title);
    const titleInputRef = useRef<HTMLInputElement>(null);
    // Enter and Escape unmount the input, which blurs it - that blur must not
    // save a second time (or save at all after Escape).
    const titleEditDone = useRef(false);

    const startTitleEdit = () => {
        titleEditDone.current = false;
        setTitleDraft(issue.title);
        setIsEditingTitle(true);
        requestAnimationFrame(() => {
            titleInputRef.current?.focus();
            titleInputRef.current?.select();
        });
    };

    const commitTitle = () => {
        if (titleEditDone.current) return;

        titleEditDone.current = true;
        const next = titleDraft.trim();

        setIsEditingTitle(false);
        if (next && next !== issue.title) save({ title: next });
    };

    return (
        <>
            <tr
                onClick={handleRowClick}
                onContextMenu={handleContextMenu}
                tabIndex={0}
                onKeyDown={(e) => {
                    // Keys from the actions button or from the (portaled)
                    // menu belong to those controls, not to the row.
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter') onClick();
                    if (e.key === ' ') {
                        e.preventDefault();
                    }
                }}
                className={cn(
                    'group/row cursor-pointer select-none outline-none transition-colors hover:bg-[var(--bg-light-color)]',
                )}
                style={{ height: rowHeight }}
            >
                <td
                    className={cn(cellBase, 'w-[48px] px-2 text-center')}
                    data-column="expand-and-checkbox"
                >
                    <div className="flex items-center justify-center gap-1">
                        <input
                            type="checkbox"
                            className={cn(
                                'h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-color-strong)] bg-[var(--surface-color)] text-[var(--accent-color)] transition-opacity focus:ring-0',
                                !issue?.isChecked &&
                                    'opacity-0 group-hover/row:opacity-100',
                                isClosed && 'opacity-20',
                            )}
                            checked={issue?.isChecked || false}
                            onChange={() => handleSelectIssueCheckbox?.(issue)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </td>
                {enabledColumns.id && (
                    <td
                        className={cn(
                            cellBase,
                            'w-[75px] font-mono text-[11px] text-[var(--text-muted-color)]',
                        )}
                        data-column="id"
                    >
                        #{issue.number ?? issue.id}
                    </td>
                )}
                {enabledColumns.title && (
                    <td
                        className={cn(
                            cellBase,
                            'truncate text-[var(--text-color)]',
                        )}
                        data-column="title"
                    >
                        <div
                            className="flex items-center gap-1"
                            style={{ paddingLeft: depth * 20 }}
                        >
                            {hasChildren ? (
                                <button
                                    type="button"
                                    aria-label={
                                        isCollapsed
                                            ? 'Expand sub-issues'
                                            : 'Collapse sub-issues'
                                    }
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleCollapse?.();
                                    }}
                                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[var(--text-muted-color)] transition-colors hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)]"
                                >
                                    <Icon
                                        name={
                                            isCollapsed
                                                ? 'ChevronRight'
                                                : 'ChevronDown'
                                        }
                                        size={12}
                                    />
                                </button>
                            ) : (
                                depth > 0 && <span className="w-4 shrink-0" />
                            )}
                            {isEditingTitle ? (
                                <input
                                    ref={titleInputRef}
                                    value={titleDraft}
                                    maxLength={255}
                                    aria-label="Issue title"
                                    onChange={(e) =>
                                        setTitleDraft(e.target.value)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    onBlur={commitTitle}
                                    onKeyDown={(e) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') commitTitle();
                                        if (e.key === 'Escape') {
                                            titleEditDone.current = true;
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    className="min-w-0 flex-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-color)] px-2 py-0.5 text-xs font-medium text-[var(--text-color)] outline-none focus:border-[var(--accent-color)] focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]"
                                />
                            ) : (
                                <>
                                    <span
                                        className={cn(
                                            // The row is the tab stop for the title, and a ring
                                            // on a table row itself doesn't render, so the title
                                            // shows the row's keyboard focus.
                                            '-mx-1 truncate rounded px-1 font-medium group-focus-visible/row:ring-2 group-focus-visible/row:ring-[var(--accent-color)]',
                                            isClosed &&
                                                'text-[var(--text-muted-color)] line-through',
                                        )}
                                    >
                                        {issue.title}
                                    </span>
                                    {can?.update && (
                                        <button
                                            type="button"
                                            aria-label="Edit title"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startTitleEdit();
                                            }}
                                            className={cn(
                                                'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border-none bg-transparent p-0 text-[var(--text-muted-color)] hover:bg-[var(--bg-dark-color)] hover:text-[var(--text-color)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color)]',
                                                REVEAL_ON_ROW_HOVER,
                                            )}
                                        >
                                            <Icon name="Pencil" size={12} />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </td>
                )}
                {enabledColumns.type && (
                    <td className={cellBase} data-column="type">
                        {issue.issueType ? (
                            <IssueTypeBadge issueType={issue.issueType} />
                        ) : (
                            <span className="text-[var(--text-muted-color)]">
                                —
                            </span>
                        )}
                    </td>
                )}
                {enabledColumns.status && (
                    <td className={cellBase} data-column="status">
                        <Editable>
                            <StatusPicker
                                statuses={getReachableStatuses(issue)}
                                value={issue.workflowStatus ?? null}
                                disabled={!can?.changeStatus}
                                revealOnRowHover
                                onChange={(status) =>
                                    save({ workflow_status_id: status.id })
                                }
                            />
                        </Editable>
                    </td>
                )}
                {enabledColumns.assignee && (
                    <td
                        className={cn(
                            cellBase,
                            'text-[var(--text-gray-color)]',
                        )}
                        data-column="assignee"
                    >
                        {can?.assign ? (
                            <Editable>
                                <AssigneePicker
                                    users={editing?.users ?? []}
                                    value={issue.assignee ?? null}
                                    selectedId={issue.assignee_id ?? null}
                                    revealOnRowHover
                                    onChange={(userId) =>
                                        save({ assignee_id: userId })
                                    }
                                />
                            </Editable>
                        ) : (
                            <UserBadge
                                avatarSrc={issue.assignee?.avatar}
                                name={issue.assignee?.name ?? 'Unassigned'}
                                size="sm"
                            />
                        )}
                    </td>
                )}
                {enabledColumns.priority && (
                    <td className={cellBase} data-column="priority">
                        {can?.changePriority ? (
                            <Editable>
                                <PriorityPicker
                                    priorities={priorities}
                                    value={issue.priorityDetails ?? null}
                                    revealOnRowHover
                                    onChange={(name) =>
                                        save({ priority: name })
                                    }
                                />
                            </Editable>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <PriorityIcon
                                    priority={issue.priorityDetails}
                                />
                                <span className="truncate capitalize text-[var(--text-color)]">
                                    {issue.priority ?? 'None'}
                                </span>
                            </div>
                        )}
                    </td>
                )}
                {enabledColumns.labels && (
                    <td className={cellBase} data-column="labels">
                        {can?.changeLabels ? (
                            <div onClick={(e) => e.stopPropagation()}>
                                <EditableLabelList
                                    labels={issue.labels || []}
                                    onSave={(labels) => save({ labels })}
                                    maxDisplay="auto"
                                    revealTrigger
                                />
                            </div>
                        ) : (
                            <LabelList
                                labels={issue.labels || []}
                                badgeClassName="text-[10px] px-1.5 py-0.2"
                                isClosed={isClosed}
                                maxDisplay="auto"
                            />
                        )}
                    </td>
                )}
                {enabledColumns.updated && (
                    <td
                        className={cn(
                            cellBase,
                            'whitespace-nowrap text-[11px] text-[var(--text-muted-color)]',
                        )}
                        data-column="updated"
                    >
                        <div className={'flex items-center gap-1'}>
                            <Icon name="Clock" size={12} />
                            {formatTimeAgo(issue.updated_at)} ago
                        </div>
                    </td>
                )}
                {enabledColumns.start_date && (
                    <td
                        className={cn(
                            cellBase,
                            'whitespace-nowrap text-[11px] text-[var(--text-muted-color)]',
                        )}
                        data-column="start_date"
                    >
                        <Editable>
                            <DatePicker
                                label="Start date"
                                value={issue.start_date}
                                disabled={!can?.update}
                                revealOnRowHover
                                onChange={(date) =>
                                    // An end before the new start moves with it.
                                    save({
                                        start_date: date,
                                        ...(issue.end_date &&
                                        issue.end_date.slice(0, 10) < date
                                            ? { end_date: date }
                                            : {}),
                                    })
                                }
                            />
                        </Editable>
                    </td>
                )}
                {enabledColumns.end_date && (
                    <td
                        className={cn(
                            cellBase,
                            'whitespace-nowrap text-[11px] text-[var(--text-muted-color)]',
                        )}
                        data-column="end_date"
                    >
                        <Editable>
                            <DatePicker
                                label="End date"
                                value={issue.end_date}
                                minDate={issue.start_date}
                                disabled={!can?.update}
                                revealOnRowHover
                                onChange={(date) => save({ end_date: date })}
                            />
                        </Editable>
                    </td>
                )}
                <td className={cellBase} aria-hidden="true" />
                <td
                    className={cn(cellBase, 'w-[50px] text-right')}
                    data-column="actions"
                >
                    <Dropdown
                        variant="menu"
                        ariaLabel="Issue actions"
                        align="end"
                        width={192}
                        options={rowMenuOptions(!onRemove)}
                        onSelect={handleMenuSelect}
                        open={isMenuOpen}
                        onOpenChange={handleMenuOpenChange}
                        anchorPoint={menuAnchor}
                        trigger={
                            <IconButton
                                iconName="Ellipsis"
                                ariaLabel="Issue actions"
                                className={cn(
                                    'rounded p-1 text-[var(--text-muted-color)] opacity-0 hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)] group-hover/row:opacity-100',
                                    isMenuOpen && 'opacity-100',
                                )}
                            />
                        }
                    />
                </td>
            </tr>
        </>
    );
};
