import {
    AssignableProjectMemberRole,
    ProjectMemberRole,
} from '@/types/ProjectMembers';

export const ROLE_LABELS: Record<ProjectMemberRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
};

/** Translation keys of the role names, for `t()`. */
export const ROLE_LABEL_KEYS: Record<ProjectMemberRole, string> = {
    owner: 'util_project_member_roles.owner',
    admin: 'util_project_member_roles.admin',
    member: 'util_project_member_roles.member',
    viewer: 'util_project_member_roles.viewer',
};

export const ROLE_ICONS: Record<
    ProjectMemberRole,
    'Crown' | 'ShieldCheck' | 'User' | 'Eye'
> = {
    owner: 'Crown',
    admin: 'ShieldCheck',
    member: 'User',
    viewer: 'Eye',
};

export const ASSIGNABLE_ROLES: AssignableProjectMemberRole[] = [
    'admin',
    'member',
    'viewer',
];
