import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import Icon from '@/Components/Atoms/Icon/Icon';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import { PriorityIcon } from '@/Components/Atoms/PriorityIcon/PriorityIcon';
import { StatusIcon } from '@/Components/Atoms/StatusIcon/StatusIcon';
import LabelList from '@/Components/Molecules/LabelList/LabelList';
import UserBadge from '@/Components/Molecules/UserBadge/UserBadge';
import { ListRowProps } from '@/types/Components';
import { cn } from '@/utils/cn';
import { formatStatusLabel } from '@/utils/text';
import { formatTimeAgo } from '@/utils/time';
import React, { useEffect, useRef, useState } from 'react';

const cellBase =
    'px-3 py-2 border-b border-[var(--border-color)] align-middle text-[12px] font-normal';

export const ListRow = ({
    issue,
    onClick,
    onRemove,
    isClosed,
    handleSelectIssueCheckbox,
    enabledColumns = {
        id: true,
        title: true,
        status: true,
        assignee: true,
        priority: true,
        labels: true,
        updated: true,
        start_date: false,
        end_date: false,
    },
    rowHeight = 36,
}: ListRowProps) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const menuRef = useRef<HTMLTableCellElement>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setIsMenuOpen(true);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(event.target as Node)
            ) {
                setIsMenuOpen(false);
            }
        };

        if (isMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () =>
            document.removeEventListener('mousedown', handleClickOutside);
    }, [isMenuOpen]);

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

    const handleEllipsisClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setMenuPosition({ x: rect.left, y: rect.bottom });
        setIsMenuOpen(!isMenuOpen);
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
                        #{issue.id}
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
                        <span
                            className={cn(
                                'truncate font-medium',
                                isClosed &&
                                    'text-[var(--text-muted-color)] line-through',
                            )}
                        >
                            {issue.title}
                        </span>
                    </td>
                )}
                {enabledColumns.status && (
                    <td className={cellBase} data-column="status">
                        <div className="flex items-center gap-1.5">
                            <StatusIcon status={issue.status} />
                            <span className="truncate capitalize text-[var(--text-color)]">
                                {formatStatusLabel(issue.status)}
                            </span>
                        </div>
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
                    ref={menuRef}
                >
                    <IconButton
                        iconName="Ellipsis"
                        onClick={handleEllipsisClick}
                        className={cn(
                            'rounded p-1 text-[var(--text-muted-color)] opacity-0 hover:bg-[var(--bg-light-color-hover)] hover:text-[var(--text-color)] group-hover/row:opacity-100',
                            isMenuOpen && 'opacity-100',
                        )}
                    />
                    {isMenuOpen && (
                        <div
                            className="fixed z-[9999] w-48 bg-transparent p-1"
                            style={{
                                top: `${menuPosition.y}px`,
                                left: `${menuPosition.x > window.innerWidth - 200 ? menuPosition.x - 192 : menuPosition.x}px`,
                            }}
                        >
                            <DropdownMenu>
                                <DropdownItem
                                    label={
                                        <div className="flex items-center gap-2 text-xs">
                                            <Icon name="Maximize2" size={13} />
                                            <span>Open issue</span>
                                        </div>
                                    }
                                    onClick={() => {
                                        onClick();
                                        setIsMenuOpen(false);
                                    }}
                                />
                                <DropdownItem
                                    label={
                                        <div className="flex items-center gap-2 text-xs">
                                            <Icon name="Trash2" size={13} />
                                            <span>Remove</span>
                                        </div>
                                    }
                                    disabled={!onRemove}
                                    onClick={() => {
                                        if (onRemove) {
                                            onRemove();
                                            setIsMenuOpen(false);
                                        }
                                    }}
                                />
                            </DropdownMenu>
                        </div>
                    )}
                </td>
            </tr>
        </>
    );
};
