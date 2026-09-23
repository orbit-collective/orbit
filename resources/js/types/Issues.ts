import { IssueType } from '@/types/IssueTypes';
import { WorkflowStatus } from '@/types/Workflow';

/**
 * A label is a per-project record now (see types/Labels.ts ProjectLabel) -
 * this alias just keeps the many existing `IssueLabel` call sites (issue
 * label arrays, filter/sort params) working as plain label name strings.
 */
export type IssueLabel = string;

export interface Comment {
    id: number;
    issue_id: number;
    user_id: number;
    body: string;
    created_at: string;
    updated_at: string;
    can_edit: boolean;
    can_delete: boolean;
    user?: {
        id: number;
        name: string;
        avatar?: string;
    };
}

export interface Issue {
    id: string;
    title: string;
    description?: string;
    status: 'open' | 'in_progress' | 'closed';
    priority: 'high' | 'medium' | 'low';
    project_id: number;
    user_id: number;
    assignee_id?: number;
    created_at?: number;
    updated_at?: number;
    assignee?: {
        avatar: string;
        created_at: string;
        email: string;
        id: number;
        name: string;
        updated_at: string;
    };
    reporter?: {
        avatar?: string;
        name: string;
    };
    creator?: {
        avatar?: string;
        name: string;
    };
    labels?: IssueLabel[];
    isChecked?: boolean;
    key?: string;
    milestone?: string;
    sprint?: string;
    parent_issue?: {
        id: string;
        title: string;
    };
    parent_id?: number | string | null;
    issue_type_id?: number;
    workflow_status_id?: number;
    issueType?: IssueType;
    workflowStatus?: WorkflowStatus;
    custom_fields?: Record<string, string | number | boolean>;
    children?: Issue[];
    parent?: Issue;
    due_date?: string | number;
    start_date?: string;
    end_date?: string;
    completed_at?: string | number;
    comments?: Comment[];
    comments_count?: number;
    attachments_count?: number;
    activity_count?: number;
    type?: string;
    visibility?: string;
}

export interface PaginatedResponse<T> {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: Array<{ url: string | null; label: string; active: boolean }>;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

export type IssuePageLooks = 'List' | 'Board' | 'Calendar' | 'Activity';
export type IssuePriority = 'high' | 'medium' | 'low';

export interface ProductivityTrendProps {
    count: number;
    day: string;
}
export type Status = 'open' | 'in_progress' | 'closed';

export type Sorting = 'AZ' | 'ZA';
export type SortingColumn =
    | 'id'
    | 'title'
    | 'type'
    | 'status'
    | 'assignee'
    | 'priority'
    | 'labels'
    | 'updated'
    | 'start_date'
    | 'end_date';

/**
 * A GitHub pull request linked to this issue via the
 * `<!-- orbit-issue:ID -->` marker. Metadata fields are nullable because a
 * link created before v0.9.2 never captured them and is never backfilled.
 */
export interface LinkedPullRequest {
    provider: 'github';
    number: number;
    title: string | null;
    repositoryOwner: string;
    repositoryName: string;
    url: string;
    sourceBranch: string | null;
    targetBranch: string | null;
    status: 'open' | null;
    draft: boolean | null;
}
