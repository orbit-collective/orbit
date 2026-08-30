import BulkActionBar from '@/Components/Molecules/BulkActionBar/BulkActionBar';
import EmptyStateCard from '@/Components/Molecules/EmptyStateCard/EmptyStateCard';
import { IssueElement } from '@/Components/Molecules/IssueElement/IssueElement';
import IssueTableHead from '@/Components/Organisms/IssueTableHead/IssueTableHead';
import { useAlert } from '@/context/AlertContext';
import { useTableResizing } from '@/hooks/useTableResizing';
import { HeaderConfig, IssueTableProps } from '@/types/Components';
import { Issue, Sorting, SortingColumn } from '@/types/Issues';
import { router } from '@inertiajs/react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const defaultWidths = {
    id: 70,
    title: 400,
    status: 120,
    assignee: 140,
    priority: 140,
    labels: 200,
    updated: 150,
    start_date: 150,
    end_date: 150,
};

export const IssueTable: React.FC<IssueTableProps> = ({
    issues,
    queryParams,
    pagination,
    project,
}) => {
    const { addAlert } = useAlert();
    const tableRef = useRef<HTMLTableElement>(null);

    const {
        columnWidths,
        rowHeight,
        updateColumnWidth,
        updateRowHeight,
        resetWidths,
    } = useTableResizing(project?.id, defaultWidths);

    const resolvedColumnWidths = Object.keys(defaultWidths).reduce(
        (acc, key) => {
            acc[key] =
                columnWidths[key] ||
                defaultWidths[key as keyof typeof defaultWidths];
            return acc;
        },
        {} as Record<string, number>,
    );

    const [isResizing, setIsResizing] = useState<string | null>(null);
    const [isResizingHeight, setIsResizingHeight] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleMouseDown = (column: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(column);
    };

    const handleHeightMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizingHeight(true);
    };

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (isResizing) {
                const th = document.querySelector(
                    `th[data-column="${isResizing}"]`,
                );
                if (th) {
                    const rect = th.getBoundingClientRect();
                    const newWidth = e.clientX - rect.left;
                    updateColumnWidth(isResizing, newWidth);
                }
            }
            if (isResizingHeight) {
                const tr = tableRef.current?.querySelector('tbody tr');
                if (tr) {
                    const rect = tr.getBoundingClientRect();
                    const newHeight = e.clientY - rect.top;
                    updateRowHeight(newHeight);
                }
            }
        },
        [isResizing, isResizingHeight, updateColumnWidth, updateRowHeight],
    );

    const handleMouseUp = useCallback(() => {
        setIsResizing(null);
        setIsResizingHeight(false);
    }, []);

    useEffect(() => {
        if (isResizing || isResizingHeight) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, isResizingHeight, handleMouseMove, handleMouseUp]);

    const handleDoubleClick = (column: string) => {
        if (!tableRef.current) return;

        const cells = tableRef.current.querySelectorAll(
            `td[data-column="${column}"]`,
        );
        let maxWidth = 80;

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (context) {
            cells.forEach((cell) => {
                const text = (cell as HTMLElement).innerText;
                const metrics = context.measureText(text);
                maxWidth = Math.max(maxWidth, metrics.width + 48);
            });
        }

        updateColumnWidth(column, maxWidth);
    };

    const [enabledColumns, setEnabledColumns] = useState<
        Record<string, boolean>
    >(() => {
        if (project?.columns) {
            return project.columns;
        }
        return {
            id: true,
            title: true,
            status: true,
            assignee: true,
            priority: true,
            labels: true,
            updated: true,
            start_date: false,
            end_date: false,
        };
    });

    useEffect(() => {
        if (project?.columns) {
            setEnabledColumns(project.columns);
        }
    }, [project?.columns]);

    const handleColumnToggle = (columnValue: string) => {
        if (columnValue === 'reset_sizes') {
            resetWidths();
            addAlert('Column sizes reset', 'information');
            return;
        }
        if (columnValue === 'row_compact') {
            updateRowHeight(32);
            addAlert('Row height: Compact', 'information');
            return;
        }
        if (columnValue === 'row_comfortable') {
            updateRowHeight(44);
            addAlert('Row height: Comfortable', 'information');
            return;
        }
        if (columnValue === 'row_spacious') {
            updateRowHeight(64);
            addAlert('Row height: Spacious', 'information');
            return;
        }

        const nextEnabled = {
            ...enabledColumns,
            [columnValue]: !enabledColumns[columnValue],
        };

        setEnabledColumns(nextEnabled);

        if (project) {
            router.patch(
                `/projects/${project.id}/columns`,
                { columns: nextEnabled },
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        addAlert('Table columns updated', 'information');
                    },
                },
            );
        }
    };

    const currentSort = queryParams?.sort as SortingColumn | undefined;
    const currentDirection = queryParams?.direction as Sorting | undefined;

    const handleSort = (column: SortingColumn) => {
        let nextDirection: Sorting = 'AZ';
        if (currentSort === column) {
            nextDirection = currentDirection === 'AZ' ? 'ZA' : 'AZ';
        }

        const { page, ...restParams } = queryParams || {};
        const newParams = {
            ...restParams,
            sort: column,
            direction: nextDirection,
        };

        router.get(window.location.pathname, newParams, {
            preserveState: true,
            replace: true,
        });

        addAlert(
            `Sorting by ${column} ${nextDirection === 'AZ' ? 'ascending' : 'descending'}`,
            'information',
        );
    };

    const handleSelectIssueCheckbox = (issue: Issue | string) => {
        if (issue === 'all') {
            if (selectedIds.length === issues.length && issues.length > 0) {
                setSelectedIds([]);
            } else {
                setSelectedIds(issues.map((i) => i.id));
            }
        } else {
            const issueId = typeof issue === 'string' ? issue : issue.id;
            setSelectedIds((prev) =>
                prev.includes(issueId)
                    ? prev.filter((id) => id !== issueId)
                    : [...prev, issueId],
            );
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;

        setIsDeleting(true);
        router.delete('/issues/bulk-destroy', {
            data: { ids: selectedIds },
            preserveScroll: true,
            onSuccess: () => {
                const count = selectedIds.length;
                setSelectedIds([]);
                addAlert(`Successfully removed ${count} items`, 'success');
            },
            onError: () => {
                addAlert('An error occurred while deleting', 'error');
            },
            onFinish: () => {
                setIsDeleting(false);
            },
        });
    };

    const headers: HeaderConfig[] = (
        [
            { label: 'ID', value: 'id' },
            { label: 'Title', value: 'title' },
            { label: 'Status', value: 'status' },
            { label: 'Assignee', value: 'assignee' },
            { label: 'Priority', value: 'priority' },
            { label: 'Labels', value: 'labels' },
            { label: 'Updated', value: 'updated' },
            { label: 'Start', value: 'start_date' },
            { label: 'End', value: 'end_date' },
        ] as HeaderConfig[]
    ).filter((h) => enabledColumns[h.value]);

    const hasIssues = issues && issues.length > 0;
    const isAllSelected =
        hasIssues && issues.every((issue) => selectedIds.includes(issue.id));

    return (
        <div className="flex w-full flex-1 flex-col overflow-hidden py-2">
            <BulkActionBar
                selectedCount={selectedIds.length}
                onBulkDelete={handleBulkDelete}
                isDeleting={isDeleting}
            />

            <div className="relative flex max-h-[calc(100vh-240px)] flex-col overflow-y-hidden rounded-xl border border-[var(--bg-light-color)] bg-[var(--bg-color)] shadow-xl">
                <div className="flex-1 overflow-x-auto">
                    <table
                        ref={tableRef}
                        className="w-full table-fixed border-separate border-spacing-0 text-left text-xs"
                    >
                        <IssueTableHead
                            headers={headers}
                            resolvedColumnWidths={resolvedColumnWidths}
                            isAllSelected={isAllSelected}
                            onSelectAll={() => handleSelectIssueCheckbox('all')}
                            isResizing={isResizing}
                            isResizingHeight={isResizingHeight}
                            currentSort={currentSort}
                            currentDirection={currentDirection}
                            hasQueryParams={queryParams !== undefined}
                            enabledColumns={enabledColumns}
                            rowHeight={rowHeight}
                            onSort={handleSort}
                            onMouseDown={handleMouseDown}
                            onDoubleClick={handleDoubleClick}
                            onHeightMouseDown={handleHeightMouseDown}
                            onColumnToggle={handleColumnToggle}
                        />
                        <tbody>
                            {hasIssues ? (
                                issues.map((issue) => (
                                    <IssueElement
                                        key={issue.id}
                                        issue={{
                                            ...issue,
                                            isChecked: selectedIds.includes(
                                                issue.id,
                                            ),
                                        }}
                                        handleSelectIssueCheckbox={
                                            handleSelectIssueCheckbox
                                        }
                                        enabledColumns={enabledColumns}
                                        rowHeight={rowHeight}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan={headers.length + 3}
                                        className="p-0"
                                    >
                                        <EmptyStateCard
                                            title="All done!"
                                            description="No issues found in this view. Everything is completed or no tasks have been assigned yet."
                                            iconName="FolderPlus"
                                            actionLabel="Create Issue"
                                            actionShortcut="c"
                                        />
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {pagination}
            </div>
        </div>
    );
};

export default IssueTable;
