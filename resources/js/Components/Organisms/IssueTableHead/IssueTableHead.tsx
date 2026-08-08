import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import SelectionDropdown from '@/Components/Molecules/SelectionDropdown/SelectionDropdown';
import TableHeaderCell from '@/Components/Molecules/TableHeaderCell/TableHeaderCell';
import { IssueTableHeadProps } from '@/types/Components';
import { FC } from 'react';
export const IssueTableHead: FC<IssueTableHeadProps> = ({
    headers,
    resolvedColumnWidths,
    isAllSelected,
    onSelectAll,
    isResizing,
    isResizingHeight,
    currentSort,
    currentDirection,
    hasQueryParams,
    enabledColumns,
    rowHeight,
    onSort,
    onMouseDown,
    onDoubleClick,
    onHeightMouseDown,
    onColumnToggle,
}) => {
    return (
        <thead>
            <tr>
                <th className="group/rowheader sticky top-0 z-30 w-[48px] border-b border-[var(--bg-light-color)] bg-[var(--bg-color)] px-4 py-3 text-center">
                    <Checkbox onChange={onSelectAll} checked={isAllSelected} />
                    <div
                        className={`absolute bottom-0 left-0 h-1 w-full cursor-row-resize transition-colors hover:bg-[var(--accent-color)] ${
                            isResizingHeight
                                ? 'h-1 bg-[var(--accent-color)]'
                                : 'bg-transparent'
                        }`}
                        onMouseDown={onHeightMouseDown}
                    />
                </th>
                {headers.map((header) => (
                    <TableHeaderCell
                        key={header.value}
                        column={header.value}
                        label={header.label}
                        width={resolvedColumnWidths[header.value]}
                        isResizing={isResizing === header.value}
                        currentSort={currentSort}
                        currentDirection={currentDirection}
                        canSort={hasQueryParams}
                        onSort={onSort}
                        onMouseDown={onMouseDown}
                        onDoubleClick={onDoubleClick}
                    />
                ))}
                <th
                    className="sticky top-0 z-30 border-b border-[var(--bg-light-color)] bg-[var(--bg-color)]"
                    aria-hidden="true"
                />
                <th className="sticky top-0 z-30 w-[50px] border-b border-[var(--bg-light-color)] bg-[var(--bg-color)] px-4 py-3 text-right">
                    <SelectionDropdown
                        options={[
                            {
                                label: 'Reset Column Sizes',
                                value: 'reset_sizes',
                            },
                            { label: '---', value: 'sep1', disabled: true },
                            { label: 'Row: Compact', value: 'row_compact' },
                            {
                                label: 'Row: Comfortable',
                                value: 'row_comfortable',
                            },
                            { label: 'Row: Spacious', value: 'row_spacious' },
                            { label: '---', value: 'sep2', disabled: true },
                            { label: 'ID', value: 'id' },
                            { label: 'Title', value: 'title' },
                            { label: 'Status', value: 'status' },
                            { label: 'Assignee', value: 'assignee' },
                            { label: 'Priority', value: 'priority' },
                            { label: 'Labels', value: 'labels' },
                            { label: 'Updated', value: 'updated' },
                            { label: 'Start Date', value: 'start_date' },
                            { label: 'End Date', value: 'end_date' },
                        ]}
                        selectedValues={[
                            ...Object.entries(enabledColumns)
                                .filter(([_, v]) => v)
                                .map(([k]) => k),
                            rowHeight === 32
                                ? 'row_compact'
                                : rowHeight === 44
                                  ? 'row_comfortable'
                                  : rowHeight === 64
                                    ? 'row_spacious'
                                    : '',
                        ]}
                        onChange={onColumnToggle}
                        trigger={
                            <IconButton
                                iconName="Settings"
                                iconSize={13}
                                className="text-[var(--text-muted-color)] opacity-40 transition-opacity hover:opacity-100"
                            />
                        }
                    />
                </th>
            </tr>
        </thead>
    );
};

export default IssueTableHead;
