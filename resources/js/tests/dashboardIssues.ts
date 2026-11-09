import { DashboardIssueRow } from '@/types/Dashboard';

/** An issue row of the dashboard's lists, with the fields that are not asked about filled in. */
export const makeIssueRow = (
    id: number,
    overrides: Partial<DashboardIssueRow> = {},
): DashboardIssueRow => ({
    id,
    number: id + 10,
    title: `Fix the thing ${id}`,
    projectId: 3,
    projectName: 'Orbit',
    projectColor: 'purple',
    type: { name: 'Bug', icon: 'Bug', color: '#ef4444' },
    priority: {
        id: 1,
        name: 'High',
        color: '#f44336',
        icon: 'SignalHigh',
        position: 0,
    },
    status: { name: 'In progress', category: 'in_progress' },
    assigneeId: 1,
    endDate: '2026-11-14',
    updatedAt: '2026-11-09T10:00:00Z',
    ...overrides,
});
