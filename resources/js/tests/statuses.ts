import { WorkflowStatus } from '@/types/Workflow';

/** One workflow status per category, for tests that only care about where an issue stands. */
export const todoStatus: WorkflowStatus = {
    id: 1,
    issueTypeId: 1,
    name: 'To Do',
    color: '#757575',
    category: 'todo',
    isInitial: true,
};

export const inProgressStatus: WorkflowStatus = {
    id: 2,
    issueTypeId: 1,
    name: 'In Progress',
    color: '#8844da',
    category: 'in_progress',
    isInitial: false,
};

export const doneStatus: WorkflowStatus = {
    id: 3,
    issueTypeId: 1,
    name: 'Done',
    color: '#4caf50',
    category: 'done',
    isInitial: false,
};
