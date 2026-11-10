import Icon from '@/Components/Atoms/Icon/Icon';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import RoleListItem from '@/Components/Molecules/RoleListItem/RoleListItem';
import { WorkspaceRole } from '@/types/Roles';
import { ROLE_TYPE_THEME } from '@/utils/roleTheme';

interface RoleSidebarProps {
    roles: WorkspaceRole[];
    selectedRoleId: number | null;
    totalPermissions: number;
    canCreateRoles: boolean;
    onSelect: (roleId: number) => void;
    onCreateRequest: () => void;
}

export default function RoleSidebar({
    roles,
    selectedRoleId,
    totalPermissions,
    canCreateRoles,
    onSelect,
    onCreateRequest,
}: RoleSidebarProps) {
    return (
        <div className="space-y-2 border-b border-(--border-color) p-4 lg:border-r lg:border-b-0">
            {roles.map((role, index) => (
                <RowReveal key={role.id} index={index}>
                    <RoleListItem
                        role={role}
                        theme={ROLE_TYPE_THEME[role.type]}
                        totalPermissions={totalPermissions}
                        selected={role.id === selectedRoleId}
                        onClick={() => onSelect(role.id)}
                    />
                </RowReveal>
            ))}

            {canCreateRoles && (
                <button
                    type="button"
                    onClick={onCreateRequest}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-(--bg-light-color) px-3 py-2.5 text-xs font-semibold text-(--text-gray-color) transition-colors hover:border-(--border-color-strong) hover:text-(--text-color)"
                >
                    <Icon name="Plus" size={13} />
                    Create role
                </button>
            )}
        </div>
    );
}
