import Icon from '@/Components/Atoms/Icon/Icon';
import CustomRolesDropdown from '@/Components/Molecules/CustomRolesDropdown/CustomRolesDropdown';
import MemberRow from '@/Components/Molecules/MemberRow/MemberRow';
import RoleBadge from '@/Components/Molecules/RoleBadge/RoleBadge';
import RoleDropdown from '@/Components/Molecules/RoleDropdown/RoleDropdown';
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
            {members.map((member) => (
                <MemberRow key={member.id} member={member}>
                    {isManager && member.role !== 'owner' ? (
                        <RoleDropdown
                            value={member.role}
                            onChange={(role) => onChangeRole(member.id, role)}
                        />
                    ) : (
                        <RoleBadge role={member.role} />
                    )}
                    <CustomRolesDropdown
                        roles={assignableRoles}
                        selectedRoleIds={member.roleIds}
                        disabled={!canAssignRoles}
                        onToggle={(roleId, enabled) =>
                            onToggleCustomRole(member, roleId, enabled)
                        }
                    />
                    {isManager && member.role !== 'owner' && (
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
            ))}
        </>
    );
}
