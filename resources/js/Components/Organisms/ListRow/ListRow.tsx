import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import IssueTypeBadge from '@/Components/Atoms/IssueTypeBadge/IssueTypeBadge';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import { StatusIcon } from '@/Components/Atoms/StatusIcon/StatusIcon';
import WorkflowStatusBadge from '@/Components/Atoms/WorkflowStatusBadge/WorkflowStatusBadge';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import LabelList from '@/Components/Molecules/LabelList/LabelList';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { ListRowProps } from '@/types/Components';
import { DropdownOptionItem } from '@/types/Dropdown';
import { cn } from '@/utils/cn';
import { DEFAULT_ENABLED_COLUMNS } from '@/utils/issueTableColumns';
import { formatStatusLabel } from '@/utils/text';
import { formatTimeAgo } from '@/utils/time';
import React, { useState } from 'react';

const rowMenuOptions = (removeDisabled: boolean): DropdownOptionItem[] => [
    { value: 'open', label: 'Open issue', icon: 'Maximize2' },
    {
        value: 'remove',
        label: 'Remove',
        icon: 'Trash',
        disabled: removeDisabled,
    },
];

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
}: ListRowProps) => {
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

    return (
        <>
            <tr
                onClick={handleRowClick}
                onContextMenu={handleContextMenu}
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') onClick();
                    if (e.key === ' ') {
                        e.preventDefault();
                    }
                }}
                className={cn(
                    'group/row cursor-pointer select-none transition-colors hover:bg-[var(--bg-light-color)]',
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
                                'h-3.5 w-3.5 cursor-pointer rounded border-[var(--border-color-strong)] bg-[var(--surface-color)] text-indigo-500 transition-opacity focus:ring-0',
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
                            <span
                                className={cn(
                                    'truncate font-medium',
                                    isClosed &&
                                        'text-[var(--text-muted-color)] line-through',
                                )}
                            >
                                {issue.title}
                            </span>
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
                        {issue.workflowStatus ? (
                            <WorkflowStatusBadge
                                status={issue.workflowStatus}
                            />
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <StatusIcon status={issue.status} />
                                <span className="truncate capitalize text-[var(--text-color)]">
                                    {formatStatusLabel(issue.status)}
                                </span>
                            </div>
                        )}
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
                        <UserBadge
                            avatarSrc={issue.assignee?.avatar}
                            name={issue.assignee?.name ?? 'Unassigned'}
                            size="sm"
                        />
                    </td>
                )}
                {enabledColumns.priority && (
                    <td className={cellBase} data-column="priority">
                        <div className="flex items-center gap-1.5">
                            <PriorityIcon priority={issue.priority} />
                            <span className="truncate capitalize text-[var(--text-color)]">
                                {issue.priority}
                            </span>
                        </div>
                    </td>
                )}
                {enabledColumns.labels && (
                    <td className={cellBase} data-column="labels">
                        <LabelList
                            labels={issue.labels || []}
                            badgeClassName="text-[10px] px-1.5 py-0.2"
                            isClosed={isClosed}
                        />
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
                        {formatTimeAgo(issue.updated_at)} ago
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
                        {issue.start_date}
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
                        {issue.end_date}
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
