import Icon from '@/Components/Atoms/Icon/Icon';
import MemberRoleDropdown from '@/Components/Molecules/MemberRoleDropdown/MemberRoleDropdown';
import MemberRow from '@/Components/Molecules/MemberRow/MemberRow';
import RoleBadge from '@/Components/Molecules/RoleBadge/RoleBadge';
import TeamAvatarStack from '@/Components/Molecules/TeamAvatarStack/TeamAvatarStack';
import {
    AssignableProjectMemberRole,
    ProjectMember,
} from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';

interface MemberListProps {
    members: ProjectMember[];
    isManager: boolean;
    canAssignRoles: boolean;
    assignableRoles: WorkspaceRole[];
    onChangeRole: (memberId: number, role: AssignableProjectMemberRole) => void;
    onToggleCustomRole: (
        member: ProjectMember,
        roleId: number,
        enabled: boolean,
    ) => void;
    onRemove: (memberId: number) => void;
}

export default function MemberList({
    members,
    isManager,
    canAssignRoles,
    assignableRoles,
    onChangeRole,
    onToggleCustomRole,
    onRemove,
}: MemberListProps) {
    return (
        <>
            <TeamAvatarStack members={members} />
            {members.map((member) => {
                const canChangeRole = isManager && member.role !== 'owner';
                const hasRoleControl =
                    canChangeRole || assignableRoles.length > 0;

                return (
                    <MemberRow key={member.id} member={member}>
                        {hasRoleControl ? (
                            <MemberRoleDropdown
                                role={member.role}
                                canChangeRole={canChangeRole}
                                onChangeRole={(role) =>
                                    onChangeRole(member.id, role)
                                }
                                customRoles={assignableRoles}
                                selectedCustomRoleIds={member.roleIds}
                                canAssignCustomRoles={canAssignRoles}
                                onToggleCustomRole={(roleId, enabled) =>
                                    onToggleCustomRole(member, roleId, enabled)
                                }
                            />
                        ) : (
                            <RoleBadge role={member.role} />
                        )}
                        {canChangeRole && (
                            <button
                                type="button"
                                title="Remove from project"
                                onClick={() => onRemove(member.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-gray-color)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                            >
                                <Icon name="UserMinus" size={15} />
                            </button>
                        )}
                    </MemberRow>
                );
            })}
        </>
    );
}
