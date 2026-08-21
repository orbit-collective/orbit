import { ProjectColors } from '@/types/Projects';

export type ProjectMemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type AssignableProjectMemberRole = Exclude<ProjectMemberRole, 'owner'>;

export interface ProjectMember {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: ProjectMemberRole;
    joinedAt: string;
    roleIds: number[];
}

export interface PendingProjectInvitation {
    id: number;
    email: string;
    role: ProjectMemberRole;
    invitedByName: string | null;
    expiresAt: string;
}

export interface MemberProjectSummary {
    id: number;
    name: string;
    color: ProjectColors;
}
