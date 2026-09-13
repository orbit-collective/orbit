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
    fields?: IssueTypeField[];
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

export type IssueFieldType =
    'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'url';

export interface IssueTypeField {
    id: number;
    issueTypeId: number;
    label: string;
    type: IssueFieldType;
    options: string[];
    placeholder: string | null;
    isRequired: boolean;
}
