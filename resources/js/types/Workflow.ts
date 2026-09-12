export type WorkflowStatusCategory = 'todo' | 'in_progress' | 'done';

export interface WorkflowStatus {
    id: number;
    issueTypeId: number;
    name: string;
    color: string;
    category: WorkflowStatusCategory;
    isInitial: boolean;
}

export interface WorkflowTransition {
    id: number;
    issueTypeId: number;
    fromStatusId: number;
    toStatusId: number;
}
