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
}

export interface IssueTypeTemplate {
    id: number;
    issueTypeId: number;
    name: string;
    description: string | null;
    defaultPriority: string | null;
    defaultLabels: string[];
}
