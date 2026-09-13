import { WorkflowStatus, WorkflowTransition } from '@/types/Workflow';

export interface IssueType {
    id: number;
    name: string;
    icon: string;
    color: string;
    description: string | null;
    isSystem: boolean;
    allowsChildren: boolean;
    isTopLevel: boolean;
    requiredFields: string[];
    restrictedRoleTypes: string[];
    statuses?: WorkflowStatus[];
    transitions?: WorkflowTransition[];
    templates?: IssueTypeTemplate[];
    allowedChildTypeIds?: number[];
}

export interface IssueTypeTemplate {
    id: number;
    issueTypeId: number;
    name: string;
    description: string | null;
    defaultPriority: string | null;
    defaultLabels: string[];
}
