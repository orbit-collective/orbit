import DropdownItem from '@/Components/Atoms/DropdownItem/DropdownItem';
import DropdownMenu from '@/Components/Atoms/DropdownMenu/DropdownMenu';
import DropdownTrigger from '@/Components/Atoms/DropdownTrigger/DropdownTrigger';
import Icon from '@/Components/Atoms/Icon/Icon';
import { useFloatingDropdown } from '@/hooks/useFloatingDropdown';
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
import { createPortal } from 'react-dom';

const sectionHeaderClass =
    'px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted-color)]';

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
    const { isOpen, setIsOpen, triggerRef, panelRef, coords } =
        useFloatingDropdown();

    return (
        <>
            <DropdownTrigger
                ref={triggerRef}
                variant="pill"
                icon={ROLE_ICONS[role]}
                badge={selectedCustomRoleIds.length}
                isOpen={isOpen}
                disabled={!canChangeRole && !canAssignCustomRoles}
                label={ROLE_LABELS[role]}
                onClick={() => setIsOpen((prev) => !prev)}
            />

            {isOpen &&
                coords &&
                createPortal(
                    <div ref={panelRef}>
                        <DropdownMenu
                            position="floating"
                            style={{
                                position: 'fixed',
                                top: coords.top,
                                left: coords.left,
                                minWidth: Math.max(coords.width, 200),
                                zIndex: 9999,
                            }}
                        >
                            <p className={sectionHeaderClass}>Role</p>
                            {ASSIGNABLE_ROLES.map((option) => (
                                <DropdownItem
                                    key={option}
                                    appearance="pill"
                                    isActive={role === option}
                                    disabled={!canChangeRole}
                                    label={
                                        <>
                                            <Icon
                                                name={ROLE_ICONS[option]}
                                                size={13}
                                                className="shrink-0"
                                            />
                                            {ROLE_LABELS[option]}
                                        </>
                                    }
                                    trailing={
                                        role === option && (
                                            <Icon
                                                name="Check"
                                                size={13}
                                                className="text-[var(--accent-color)]"
                                            />
                                        )
                                    }
                                    onClick={() => onChangeRole(option)}
                                />
                            ))}

                            {customRoles.length > 0 && (
                                <>
                                    <div className="my-1 border-t border-[var(--border-color)]" />
                                    <p className={sectionHeaderClass}>
                                        Custom roles
                                    </p>
                                    {customRoles.map((customRole) => {
                                        const checked =
                                            selectedCustomRoleIds.includes(
                                                customRole.id,
                                            );

                                        return (
                                            <DropdownItem
                                                key={customRole.id}
                                                appearance="pill"
                                                isActive={checked}
                                                disabled={!canAssignCustomRoles}
                                                label={
                                                    <>
                                                        <span
                                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                                                checked
                                                                    ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                                                                    : 'border-[var(--border-color-strong)] bg-[var(--surface-color)]'
                                                            }`}
                                                        >
                                                            {checked && (
                                                                <Icon
                                                                    name="Check"
                                                                    size={10}
                                                                    className="text-white"
                                                                />
                                                            )}
                                                        </span>
                                                        {customRole.name}
                                                    </>
                                                }
                                                onClick={() =>
                                                    onToggleCustomRole(
                                                        customRole.id,
                                                        !checked,
                                                    )
                                                }
                                            />
                                        );
                                    })}
                                </>
                            )}
                        </DropdownMenu>
                    </div>,
                    document.body,
                )}
        </>
    );
}
