import type { WorkflowStatus } from '@/types/Workflow';

export interface User {
    id: number;
    name: string;
    email: string;
    password: string;
    avatar: string;
    created_at: string;
    updated_at: string;
}

export interface AssignableUser {
    id: number;
    name: string;
    avatar?: string | null;
}

export interface Session {
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    lastActiveAt: string;
    isCurrent: boolean;
}

/** A person as returned by the avatar hover-card endpoint. */
export interface UserPreview {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    recentIssues: UserPreviewIssue[];
}

export interface UserPreviewIssue {
    id: number;
    number: number;
    title: string;
    project_id: number;
    workflowStatus: WorkflowStatus | null;
    updated_at: string | null;
}
