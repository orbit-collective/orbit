import { describe, expect, test } from 'vitest';
import {
    actionMeta,
    conditionFieldsForTrigger,
    triggerMeta,
} from './automationMeta';

describe('automationMeta', () => {
    test('returns known metadata for a real trigger type', () => {
        expect(triggerMeta('github.pull_request.merged')).toEqual({
            icon: 'GitMerge',
            color: 'var(--accent-color)',
        });
    });

    test('returns known metadata for a real action type', () => {
        expect(actionMeta('change_status')).toEqual({
            icon: 'Workflow',
            color: 'var(--info-color)',
        });
    });

    test('falls back to a neutral icon for an unknown trigger type', () => {
        expect(triggerMeta('some.future.trigger')).toEqual({
            icon: 'Zap',
            color: 'var(--text-gray-color)',
        });
    });

    test('falls back to a neutral icon for an unknown action type', () => {
        expect(actionMeta('some_future_action')).toEqual({
            icon: 'Zap',
            color: 'var(--text-gray-color)',
        });
    });

    test('returns issue-only fields for the issue.status_changed trigger', () => {
        const fields = conditionFieldsForTrigger('issue.status_changed');

        expect(fields.map((f) => f.value)).toEqual([
            'issue.id',
            'issue.status',
            'issue.previousStatus',
        ]);
    });

    test('returns the full pull request context for every GitHub trigger', () => {
        const merged = conditionFieldsForTrigger('github.pull_request.merged');
        const opened = conditionFieldsForTrigger('github.pull_request.opened');

        expect(merged).toEqual(opened);
        expect(merged.map((f) => f.value)).toContain('pullRequest.title');
        expect(merged.map((f) => f.value)).toContain('repository.owner');
    });
});
