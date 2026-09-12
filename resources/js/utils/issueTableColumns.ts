import { SortingColumn } from '@/types/Issues';

export interface IssueTableColumnDefinition {
    value: SortingColumn;
    label: string;
    defaultWidth: number;
    defaultEnabled: boolean;
}

/**
 * Single source of truth for the issue table's toggleable columns: which
 * ones exist, their header label, default width, and whether they're on by
 * default for a project that hasn't customized its column set yet. Drives
 * IssueTable's headers/defaultWidths, IssueTableHead's column-visibility
 * dropdown, and ListRow's default enabledColumns prop, so adding a column
 * only means adding one entry here (plus its actual <td> markup in
 * ListRow, which stays bespoke per column like the others).
 */
export const ISSUE_TABLE_COLUMNS: IssueTableColumnDefinition[] = [
    { value: 'id', label: 'ID', defaultWidth: 70, defaultEnabled: true },
    { value: 'title', label: 'Title', defaultWidth: 400, defaultEnabled: true },
    { value: 'type', label: 'Type', defaultWidth: 140, defaultEnabled: true },
    {
        value: 'status',
        label: 'Status',
        defaultWidth: 120,
        defaultEnabled: true,
    },
    {
        value: 'assignee',
        label: 'Assignee',
        defaultWidth: 140,
        defaultEnabled: true,
    },
    {
        value: 'priority',
        label: 'Priority',
        defaultWidth: 140,
        defaultEnabled: true,
    },
    {
        value: 'labels',
        label: 'Labels',
        defaultWidth: 200,
        defaultEnabled: true,
    },
    {
        value: 'updated',
        label: 'Updated',
        defaultWidth: 150,
        defaultEnabled: true,
    },
    {
        value: 'start_date',
        label: 'Start',
        defaultWidth: 150,
        defaultEnabled: false,
    },
    {
        value: 'end_date',
        label: 'End',
        defaultWidth: 150,
        defaultEnabled: false,
    },
];

export const DEFAULT_ENABLED_COLUMNS: Record<string, boolean> =
    ISSUE_TABLE_COLUMNS.reduce(
        (acc, column) => {
            acc[column.value] = column.defaultEnabled;
            return acc;
        },
        {} as Record<string, boolean>,
    );

export const DEFAULT_COLUMN_WIDTHS: Record<string, number> =
    ISSUE_TABLE_COLUMNS.reduce(
        (acc, column) => {
            acc[column.value] = column.defaultWidth;
            return acc;
        },
        {} as Record<string, number>,
    );
