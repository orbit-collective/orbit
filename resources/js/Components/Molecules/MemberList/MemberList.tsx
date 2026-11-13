import { useLaravelReactI18n } from 'laravel-react-i18n';
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
    canUpdateRoles: boolean;
    canRemoveMembers: boolean;
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
    canUpdateRoles,
    canRemoveMembers,
    canAssignRoles,
    assignableRoles,
    onChangeRole,
    onToggleCustomRole,
    onRemove,
}: MemberListProps) {
    const { t } = useLaravelReactI18n();
    return (
        <>
            <TeamAvatarStack members={members} />
            {members.map((member, index) => {
                const isOwner = member.role === 'owner';
                const canChangeRole = canUpdateRoles && !isOwner;
                const canRemove = canRemoveMembers && !isOwner;
                const hasRoleControl =
                    canChangeRole || assignableRoles.length > 0;

                return (
                    <MemberRow key={member.id} member={member} index={index}>
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
                        {canRemove && (
                            <button
                                type="button"
                                title={t('member_list.remove')}
                                onClick={() => onRemove(member.id)}
                                className="flex h-9 w-9 items-center justify-center rounded-md text-(--text-gray-color) transition-colors hover:bg-red-500/10 hover:text-red-400"
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
