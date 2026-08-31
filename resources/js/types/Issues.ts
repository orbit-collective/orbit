export type IssueLabel =
    'bug' | 'feature' | 'performance' | 'design' | 'ux' | 'chore';

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
    | 'status'
    | 'assignee'
    | 'priority'
    | 'labels'
    | 'updated'
    | 'start_date'
    | 'end_date';
