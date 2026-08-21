import PillDropdown, {
    PillDropdownOption,
} from '@/Components/Molecules/PillDropdown/PillDropdown';
import { AssignableProjectMemberRole } from '@/types/ProjectMembers';
import {
    ASSIGNABLE_ROLES,
    ROLE_ICONS,
    ROLE_LABELS,
} from '@/utils/projectMemberRoles';

interface RoleDropdownProps {
    value: AssignableProjectMemberRole;
    onChange: (role: AssignableProjectMemberRole) => void;
    disabled?: boolean;
}

export default function RoleDropdown({
    value,
    onChange,
    disabled,
}: RoleDropdownProps) {
    return (
        <PillDropdown
            label={ROLE_LABELS[value]}
            icon={ROLE_ICONS[value]}
            disabled={disabled}
            className="w-32"
        >
            {(close) =>
                ASSIGNABLE_ROLES.map((role) => (
                    <PillDropdownOption
                        key={role}
                        label={ROLE_LABELS[role]}
                        icon={ROLE_ICONS[role]}
                        isActive={value === role}
                        onClick={() => {
                            onChange(role);
                            close();
                        }}
                    />
                ))
            }
        </PillDropdown>
    );
}
