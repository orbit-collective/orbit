import { ActivityLogEntry } from '@/types/ActivityLog';
import { Comment, Issue } from '@/types/Issues';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { Notification } from '@/types/Notification';
import { ProjectPriority } from '@/types/Priorities';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { WorkflowStatus, WorkflowTransition } from '@/types/Workflow';

/**
 * Shared sample data for stories: one believable Orbit workspace that every
 * component story can draw from, so stories look alike and stay short.
 * Typed against the app's own types, so a changed prop contract breaks the
 * fixture (and `tsc`) instead of silently rendering stale stories.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = Date.now();
const isoAgo = (ms: number) => new Date(now - ms).toISOString();

// --- People -----------------------------------------------------------------

export const users: AssignableUser[] = [
    { id: 1, name: 'Jane Cooper', avatar: null },
    { id: 2, name: 'Marcus Lee', avatar: null },
    { id: 3, name: 'Priya Patel', avatar: null },
    { id: 4, name: 'Tom Becker', avatar: null },
];

export const [jane, marcus, priya, tom] = users;

// --- Projects ---------------------------------------------------------------

export const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: 'The issue tracker itself.',
    color: 'purple',
    created_at: now - 90 * DAY,
    updated_at: now - DAY,
    ...overrides,
});

export const projects: Project[] = [
    makeProject(),
    makeProject({
        id: 2,
        name: 'Mobile App',
        slug: 'mobile-app',
        color: 'sky',
    }),
    makeProject({
        id: 3,
        name: 'Marketing Site',
        slug: 'marketing-site',
        color: 'pink',
    }),
    makeProject({ id: 4, name: 'Billing', slug: 'billing', color: 'green' }),
    makeProject({
        id: 5,
        name: 'Data Platform',
        slug: 'data-platform',
        color: 'orange',
    }),
];

export const project = projects[0];

// --- Labels -----------------------------------------------------------------

export const labels: ProjectLabel[] = [
    {
        id: 1,
        name: 'bug',
        color: '#f44336',
        description: 'Something is broken',
        isSystem: true,
    },
    {
        id: 2,
        name: 'feature',
        color: '#2196f3',
        description: 'New functionality',
        isSystem: true,
    },
    {
        id: 3,
        name: 'performance',
        color: '#9c27b0',
        description: null,
        isSystem: true,
    },
    {
        id: 4,
        name: 'design',
        color: '#00bcd4',
        description: null,
        isSystem: true,
    },
    { id: 5, name: 'ux', color: '#009688', description: null, isSystem: true },
    {
        id: 6,
        name: 'chore',
        color: '#e91e63',
        description: null,
        isSystem: true,
    },
    {
        id: 7,
        name: 'customer-request',
        color: '#ff9800',
        description: 'Asked for by a customer',
        isSystem: false,
    },
];

// --- Issue types with a workflow ---------------------------------------------

const status = (
    id: number,
    issueTypeId: number,
    name: string,
    color: string,
    category: WorkflowStatus['category'],
    isInitial = false,
): WorkflowStatus => ({ id, issueTypeId, name, color, category, isInitial });

const transition = (
    id: number,
    issueTypeId: number,
    fromStatusId: number,
    toStatusId: number,
): WorkflowTransition => ({ id, issueTypeId, fromStatusId, toStatusId });

export const taskStatuses = [
    status(1, 1, 'To do', '#757575', 'todo', true),
    status(2, 1, 'In progress', '#8844da', 'in_progress'),
    status(3, 1, 'In review', '#ff9800', 'in_progress'),
    status(4, 1, 'Done', '#4caf50', 'done'),
];

const bugStatuses = [
    status(5, 2, 'Open', '#f44336', 'todo', true),
    status(6, 2, 'Fixing', '#8844da', 'in_progress'),
    status(7, 2, 'Resolved', '#4caf50', 'done'),
];

export const issueTypes: IssueType[] = [
    {
        id: 1,
        name: 'Task',
        icon: 'SquareCheck',
        color: '#2196f3',
        description: 'A unit of work.',
        isSystem: true,
        allowsChildren: true,
        isTopLevel: true,
        requiredFields: [],
        restrictedRoleTypes: [],
        statuses: taskStatuses,
        transitions: [
            transition(1, 1, 1, 2),
            transition(2, 1, 2, 3),
            transition(3, 1, 3, 4),
            transition(4, 1, 3, 2),
            transition(5, 1, 4, 1),
        ],
        templates: [],
        fields: [],
        allowedChildTypeIds: [1, 2],
    },
    {
        id: 2,
        name: 'Bug',
        icon: 'Bug',
        color: '#f44336',
        description: 'Something that does not work as intended.',
        isSystem: true,
        allowsChildren: false,
        isTopLevel: true,
        requiredFields: [],
        restrictedRoleTypes: [],
        statuses: bugStatuses,
        transitions: [
            transition(6, 2, 5, 6),
            transition(7, 2, 6, 7),
            transition(8, 2, 7, 5),
        ],
        templates: [],
        fields: [
            {
                id: 1,
                issueTypeId: 2,
                label: 'Severity',
                type: 'select',
                options: ['Minor', 'Major', 'Critical'],
                placeholder: null,
                isRequired: true,
            },
        ],
        allowedChildTypeIds: [],
    },
    {
        id: 3,
        name: 'Epic',
        icon: 'Rocket',
        color: '#9c27b0',
        description: 'A large body of work split into tasks.',
        isSystem: true,
        allowsChildren: true,
        isTopLevel: true,
        requiredFields: [],
        restrictedRoleTypes: [],
        statuses: taskStatuses.map((s) => ({ ...s, issueTypeId: 3 })),
        transitions: [],
        templates: [],
        fields: [],
        allowedChildTypeIds: [1, 2],
    },
];

export const [taskType, bugType, epicType] = issueTypes;

// --- Issues -----------------------------------------------------------------

// --- Priorities -------------------------------------------------------------

export const priorities: ProjectPriority[] = [
    {
        id: 1,
        name: 'High',
        color: '#f44336',
        icon: 'SignalHigh',
        position: 0,
        isDefault: false,
    },
    {
        id: 2,
        name: 'Medium',
        color: '#ff9800',
        icon: 'SignalMedium',
        position: 1,
        isDefault: true,
    },
    {
        id: 3,
        name: 'Low',
        color: '#4caf50',
        icon: 'SignalLow',
        position: 2,
        isDefault: false,
    },
];

const findPriority = (name: string | null | undefined) =>
    priorities.find(
        (priority) => priority.name.toLowerCase() === name?.toLowerCase(),
    ) ?? null;

/** The priority fields an issue carries for one of the fixture priorities, by name (case-insensitive). */
export const priorityFields = (
    name: string | null,
): Pick<Issue, 'priority' | 'priority_id' | 'priorityDetails'> => {
    const priority = findPriority(name);

    return {
        priority: priority?.name ?? null,
        priority_id: priority?.id ?? null,
        priorityDetails: priority
            ? {
                  id: priority.id,
                  name: priority.name,
                  color: priority.color,
                  icon: priority.icon,
                  position: priority.position,
              }
            : null,
    };
};

export const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '101',
    number: 12,
    title: 'Fix login redirect after session timeout',
    description:
        'Users are sent to the dashboard instead of the page they were on.',
    ...priorityFields('high'),
    project_id: 1,
    user_id: 1,
    assignee_id: 2,
    created_at: now - 3 * DAY,
    updated_at: now - 2 * HOUR,
    assignee: {
        id: 2,
        name: 'Marcus Lee',
        email: 'marcus@orbit.dev',
        avatar: '',
        created_at: isoAgo(60 * DAY),
        updated_at: isoAgo(DAY),
    },
    creator: { name: 'Jane Cooper' },
    labels: ['bug', 'ux'],
    issue_type_id: 2,
    workflow_status_id: 6,
    issueType: bugType,
    workflowStatus: bugStatuses[1],
    start_date: '2026-10-05',
    end_date: '2026-10-16',
    comments_count: 3,
    ...overrides,
    // Naming just `priority` is enough: its canonical name, id and details follow.
    ...(overrides.priority !== undefined &&
    overrides.priorityDetails === undefined
        ? priorityFields(overrides.priority)
        : {}),
});

export const issues: Issue[] = [
    makeIssue(),
    makeIssue({
        id: '102',
        number: 13,
        title: 'Add keyboard shortcuts to the issue board',
        priority: 'medium',
        assignee_id: undefined,
        assignee: undefined,
        labels: ['feature'],
        issue_type_id: 1,
        workflow_status_id: 1,
        issueType: taskType,
        workflowStatus: taskStatuses[0],
        start_date: undefined,
        end_date: undefined,
        comments_count: 0,
    }),
    makeIssue({
        id: '103',
        number: 14,
        title: 'Board column drag handle is not reachable by keyboard',
        priority: 'high',
        labels: ['bug', 'design', 'ux'],
        workflowStatus: bugStatuses[0],
        workflow_status_id: 5,
        comments_count: 5,
    }),
    makeIssue({
        id: '104',
        number: 15,
        title: 'Speed up the project list for workspaces with 10k issues',
        priority: 'low',
        labels: ['performance'],
        issue_type_id: 1,
        workflow_status_id: 3,
        issueType: taskType,
        workflowStatus: taskStatuses[2],
        comments_count: 1,
    }),
    makeIssue({
        id: '105',
        number: 16,
        title: 'Release 0.11 checklist',
        priority: 'medium',
        labels: ['chore'],
        issue_type_id: 1,
        workflow_status_id: 4,
        issueType: taskType,
        workflowStatus: taskStatuses[3],
        comments_count: 0,
    }),
    makeIssue({
        id: '106',
        number: 17,
        title: 'Rework onboarding for new workspaces',
        priority: 'high',
        labels: ['feature', 'customer-request'],
        issue_type_id: 3,
        workflow_status_id: 1,
        issueType: epicType,
        workflowStatus: { ...taskStatuses[0], issueTypeId: 3 },
        comments_count: 8,
    }),
];

export const issue = issues[0];

// --- Comments, notifications, activity ----------------------------------------

export const comments: Comment[] = [
    {
        id: 1,
        issue_id: 101,
        user_id: 1,
        body: 'Reproduced on staging. The redirect target is dropped when the session expires.',
        created_at: isoAgo(2 * DAY),
        updated_at: isoAgo(2 * DAY),
        can_edit: true,
        can_delete: true,
        user: { id: 1, name: 'Jane Cooper' },
    },
    {
        id: 2,
        issue_id: 101,
        user_id: 2,
        body: 'I will take this one. Looks like the intended URL is not stored before the login redirect.',
        created_at: isoAgo(DAY),
        updated_at: isoAgo(DAY),
        can_edit: false,
        can_delete: false,
        user: { id: 2, name: 'Marcus Lee' },
    },
];

export const notifications: Notification[] = [
    {
        id: 1,
        user_id: 1,
        type: 'info',
        title: 'You were assigned #12',
        message:
            'Marcus Lee assigned "Fix login redirect after session timeout" to you.',
        read: false,
        action_url: '/projects/1/issues/101',
        created_at: isoAgo(HOUR),
    },
    {
        id: 2,
        user_id: 1,
        type: 'success',
        title: 'Release 0.11 checklist is done',
        message: 'All items on the checklist were completed.',
        read: false,
        action_url: '/projects/1/issues/105',
        created_at: isoAgo(5 * HOUR),
    },
    {
        id: 3,
        user_id: 1,
        type: 'warning',
        title: 'GitHub sync is failing',
        message:
            'The last three syncs for orbit-collective/orbit returned an error.',
        read: true,
        action_url: '/settings/integrations',
        created_at: isoAgo(DAY),
    },
    {
        id: 4,
        user_id: 1,
        type: 'error',
        title: 'Import failed',
        message: 'The Jira import stopped after 140 of 600 issues.',
        read: true,
        action_url: '/settings/integrations',
        created_at: isoAgo(3 * DAY),
    },
];

export const activityEntries: ActivityLogEntry[] = [
    {
        id: 1,
        body: 'Created issue #12 "Fix login redirect after session timeout"',
        userId: 1,
        userName: 'Jane Cooper',
        userAvatar: null,
        createdAt: isoAgo(3 * DAY),
    },
    {
        id: 2,
        body: 'Changed the status of #12 from Open to Fixing',
        userId: 2,
        userName: 'Marcus Lee',
        userAvatar: null,
        createdAt: isoAgo(DAY),
    },
    {
        id: 3,
        body: 'Added the label "ux" to #12',
        userId: 2,
        userName: 'Marcus Lee',
        userAvatar: null,
        createdAt: isoAgo(DAY - HOUR),
    },
];
