import { useLaravelReactI18n } from 'laravel-react-i18n';
import { FC } from 'react';
import Checkbox from '@/Components/Atoms/Checkbox/Checkbox';
import IconButton from '@/Components/Atoms/IconButton/IconButton';
import SelectionDropdown from '@/Components/Molecules/SelectionDropdown/SelectionDropdown';
import TableHeaderCell from '@/Components/Molecules/TableHeaderCell/TableHeaderCell';
import { IssueTableHeadProps } from '@/types/Components';
import { ISSUE_TABLE_COLUMNS } from '@/utils/issueTableColumns';
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
    const { t } = useLaravelReactI18n();

    return (
        <thead>
            <tr>
                <th className="group/rowheader sticky top-0 z-30 w-[48px] border-b border-(--bg-light-color) bg-(--bg-color) px-4 py-3 text-center">
                    <Checkbox onChange={onSelectAll} checked={isAllSelected} />
                    <div
                        className={`absolute bottom-0 left-0 h-1 w-full cursor-row-resize transition-colors hover:bg-(--accent-color) ${
                            isResizingHeight
                                ? 'h-1 bg-(--accent-color)'
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
                    className="sticky top-0 z-30 border-b border-(--bg-light-color) bg-(--bg-color)"
                    aria-hidden="true"
                />
                <th className="sticky top-0 z-30 w-[50px] border-b border-(--bg-light-color) bg-(--bg-color) px-4 py-3 text-right">
                    <SelectionDropdown
                        options={[
                            {
                                label: t('issue_table_head.reset_sizes'),
                                value: 'reset_sizes',
                                kind: 'action',
                            },
                            { label: '', value: 'sep1', kind: 'separator' },
                            {
                                label: t('issue_table_head.row_compact'),
                                value: 'row_compact',
                                kind: 'radio',
                            },
                            {
                                label: t('issue_table_head.row_comfortable'),
                                value: 'row_comfortable',
                                kind: 'radio',
                            },
                            {
                                label: t('issue_table_head.row_spacious'),
                                value: 'row_spacious',
                                kind: 'radio',
                            },
                            { label: '', value: 'sep2', kind: 'separator' },
                            ...ISSUE_TABLE_COLUMNS.map((column) => ({
                                label: t(
                                    `issue_table_head.columns.${column.value}`,
                                ),
                                value: column.value,
                            })),
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
                                ariaLabel={t(
                                    'issue_table_head.display_options',
                                )}
                                className="text-(--text-muted-color) opacity-40 transition-opacity hover:opacity-100"
                            />
                        }
                    />
                </th>
            </tr>
        </thead>
    );
};

export default IssueTableHead;
