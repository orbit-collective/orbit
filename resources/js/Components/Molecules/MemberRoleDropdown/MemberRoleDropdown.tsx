import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import Dropdown from '@/Components/Molecules/Dropdown/Dropdown';
import { DropdownOptionItem } from '@/types/Dropdown';
import {
    AssignableProjectMemberRole,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { WorkspaceRole } from '@/types/Roles';
import {
    ASSIGNABLE_ROLES,
    ROLE_ICONS,
    ROLE_LABELS,
} from '@/utils/projectMemberRoles';
import { useMemo } from 'react';

const CUSTOM_ROLE_PREFIX = 'custom:';

interface MemberRoleDropdownProps {
    role: ProjectMemberRole;
    canChangeRole: boolean;
    onChangeRole: (role: AssignableProjectMemberRole) => void;
    customRoles: WorkspaceRole[];
    selectedCustomRoleIds: number[];
    canAssignCustomRoles: boolean;
    onToggleCustomRole: (roleId: number, enabled: boolean) => void;
}

/**
 * A single dropdown for both a member's base role and their custom roles —
 * previously two separate controls sitting side by side. Either section can
 * be non-interactive (e.g. the owner's base role, or custom roles without
 * the roles.assign permission) while the other stays usable.
 */
export default function MemberRoleDropdown({
    role,
    canChangeRole,
    onChangeRole,
    customRoles,
    selectedCustomRoleIds,
    canAssignCustomRoles,
    onToggleCustomRole,
}: MemberRoleDropdownProps) {
    const options = useMemo((): DropdownOptionItem[] => {
        const roleOptions: DropdownOptionItem[] = ASSIGNABLE_ROLES.map(
            (option) => ({
                value: option,
                label: ROLE_LABELS[option],
                icon: ROLE_ICONS[option],
                role: 'menuitemradio',
                indicator: 'check',
                disabled: !canChangeRole,
                closeOnSelect: false,
            }),
        );

        if (customRoles.length === 0) {
            return [
                { value: 'heading:role', label: 'Role', kind: 'heading' },
                ...roleOptions,
            ];
        }

        return [
            { value: 'heading:role', label: 'Role', kind: 'heading' },
            ...roleOptions,
            { value: 'separator:custom', label: '', kind: 'separator' },
            {
                value: 'heading:custom',
                label: 'Custom roles',
                kind: 'heading',
            },
            ...customRoles.map((customRole): DropdownOptionItem => ({
                value: `${CUSTOM_ROLE_PREFIX}${customRole.id}`,
                label: customRole.name,
                role: 'menuitemcheckbox',
                indicator: 'check',
                disabled: !canAssignCustomRoles,
                closeOnSelect: false,
            })),
        ];
    }, [canChangeRole, canAssignCustomRoles, customRoles]);

    const selectedValues = useMemo(
        () => [
            role,
            ...selectedCustomRoleIds.map((id) => `${CUSTOM_ROLE_PREFIX}${id}`),
        ],
        [role, selectedCustomRoleIds],
    );

    const handleSelect = (value: string) => {
        if (value.startsWith(CUSTOM_ROLE_PREFIX)) {
            const roleId = Number(value.slice(CUSTOM_ROLE_PREFIX.length));
            onToggleCustomRole(roleId, !selectedCustomRoleIds.includes(roleId));
            return;
        }

        onChangeRole(value as AssignableProjectMemberRole);
    };

    return (
        <Dropdown
            variant="menu"
            ariaLabel="Member roles"
            options={options}
            selectedValues={selectedValues}
            onSelect={handleSelect}
            disabled={!canChangeRole && !canAssignCustomRoles}
            width={200}
            trigger={({ isOpen }) => (
                <DropdownTrigger
                    variant="pill"
                    icon={ROLE_ICONS[role]}
                    badge={selectedCustomRoleIds.length}
                    isOpen={isOpen}
                    disabled={!canChangeRole && !canAssignCustomRoles}
                    label={ROLE_LABELS[role]}
                />
            )}
        />
    );
}
