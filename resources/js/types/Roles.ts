export type RoleTypeValue = 'owner' | 'admin' | 'member' | 'viewer' | 'custom';

export interface PermissionDefinition {
    id: number;
    key: string;
    group: string;
}

export interface WorkspaceRole {
    id: number;
    name: string;
    slug: string;
    type: RoleTypeValue;
    isSystem: boolean;
    memberCount: number;
    permissionIds: number[];
}
