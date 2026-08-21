import PillDropdown, {
    PillDropdownCheckOption,
} from '@/Components/Molecules/PillDropdown/PillDropdown';
import { WorkspaceRole } from '@/types/Roles';

interface CustomRolesDropdownProps {
    roles: WorkspaceRole[];
    selectedRoleIds: number[];
    onToggle: (roleId: number, enabled: boolean) => void;
    disabled?: boolean;
}

export default function CustomRolesDropdown({
    roles,
    selectedRoleIds,
    onToggle,
    disabled,
}: CustomRolesDropdownProps) {
    if (roles.length === 0) {
        return null;
    }

    const label =
        selectedRoleIds.length === 0
            ? 'No custom roles'
            : `${selectedRoleIds.length} custom role${
                  selectedRoleIds.length === 1 ? '' : 's'
              }`;

    return (
        <PillDropdown
            label={label}
            icon="Sparkles"
            badge={selectedRoleIds.length}
            disabled={disabled}
            className="w-44"
        >
            {roles.map((role) => (
                <PillDropdownCheckOption
                    key={role.id}
                    label={role.name}
                    checked={selectedRoleIds.includes(role.id)}
                    disabled={disabled}
                    onChange={(checked) => onToggle(role.id, checked)}
                />
            ))}
        </PillDropdown>
    );
}
