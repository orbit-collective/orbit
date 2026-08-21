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
