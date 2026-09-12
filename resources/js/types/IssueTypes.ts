import { WorkflowStatus, WorkflowTransition } from '@/types/Workflow';

export interface IssueType {
    id: number;
    name: string;
    icon: string;
    color: string;
    description: string | null;
    isSystem: boolean;
    allowsChildren: boolean;
    requiredFields: string[];
    restrictedRoleTypes: string[];
    statuses?: WorkflowStatus[];
    transitions?: WorkflowTransition[];
}

export interface IssueTypeTemplate {
    id: number;
    issueTypeId: number;
    name: string;
    description: string | null;
    defaultPriority: string | null;
    defaultLabels: string[];
}
