import { describe, expect, test } from 'vitest';
import {
    getPermissionDescription,
    getPermissionLabel,
    getPermissionSection,
} from './permissions';

describe('permissions', () => {
    test('returns a proper label and description for issue type permissions', () => {
        const permission = {
            id: 1,
            key: 'projects.issue_types.workflow_update',
            group: 'projects',
        };

        expect(getPermissionLabel(permission)).toBe('Manage workflows');
        expect(getPermissionDescription(permission)).toContain('transitions');
    });

    test('groups issue type permissions under their own section', () => {
        expect(getPermissionSection('projects.issue_types.view')).toBe(
            'Issue Types',
        );
    });

    test('falls back to a humanized label when a permission has no meta entry', () => {
        const permission = {
            id: 2,
            key: 'projects.something_new.frobnicate',
            group: 'projects',
        };

        expect(getPermissionLabel(permission)).toBe('Frobnicate');
        expect(getPermissionDescription(permission)).toBe('');
    });
});
