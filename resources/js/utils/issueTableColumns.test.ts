import { describe, expect, test } from 'vitest';
import {
    DEFAULT_COLUMN_WIDTHS,
    DEFAULT_ENABLED_COLUMNS,
    ISSUE_TABLE_COLUMNS,
} from './issueTableColumns';

describe('issueTableColumns', () => {
    test('includes the type column alongside the legacy columns', () => {
        const values = ISSUE_TABLE_COLUMNS.map((c) => c.value);

        expect(values).toContain('type');
        expect(values).toContain('status');
        expect(values).toContain('id');
    });

    test('DEFAULT_ENABLED_COLUMNS reflects each column\'s defaultEnabled flag', () => {
        expect(DEFAULT_ENABLED_COLUMNS.type).toBe(true);
        expect(DEFAULT_ENABLED_COLUMNS.start_date).toBe(false);
        expect(DEFAULT_ENABLED_COLUMNS.end_date).toBe(false);
    });

    test('DEFAULT_COLUMN_WIDTHS has an entry for every column', () => {
        ISSUE_TABLE_COLUMNS.forEach((column) => {
            expect(DEFAULT_COLUMN_WIDTHS[column.value]).toBe(
                column.defaultWidth,
            );
        });
    });
});
