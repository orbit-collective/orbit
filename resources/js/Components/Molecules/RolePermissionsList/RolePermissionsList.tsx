import Icon from '@/Components/Atoms/Icon/Icon';
import Input from '@/Components/Atoms/Input/Input';
import PermissionGroupCard from '@/Components/Molecules/PermissionGroupCard/PermissionGroupCard';
import { PermissionGroup } from '@/utils/permissionGroups';

interface RolePermissionsListProps {
    groups: PermissionGroup[];
    search: string;
    onSearchChange: (value: string) => void;
    enabledIds: number[];
    canEdit: boolean;
    onToggle: (permissionId: number, enabled: boolean) => void;
    onSetAll: (
        permissions: PermissionGroup['permissions'],
        enable: boolean,
    ) => void;
}

export default function RolePermissionsList({
    groups,
    search,
    onSearchChange,
    enabledIds,
    canEdit,
    onToggle,
    onSetAll,
}: RolePermissionsListProps) {
    return (
        <>
            <div className="relative px-5 py-4">
                <Icon
                    name="Search"
                    size={14}
                    className="pointer-events-none absolute left-8 top-1/2 -translate-y-1/2 text-[var(--text-gray-color)]"
                />
                <Input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search permissions..."
                    className="pl-8"
                />
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto px-5 pb-5">
                {groups.length === 0 && (
                    <p className="py-6 text-center text-sm text-[var(--text-gray-color)]">
                        No permissions match "{search}".
                    </p>
                )}

                {groups.map((group) => (
                    <PermissionGroupCard
                        key={group.group}
                        label={group.label}
                        icon={group.icon}
                        sections={group.sections}
                        permissionIds={group.permissions.map((p) => p.id)}
                        enabledIds={enabledIds}
                        canEdit={canEdit}
                        forceExpanded={search.trim() !== ''}
                        onToggle={onToggle}
                        onSetAll={(_, enable) =>
                            onSetAll(group.permissions, enable)
                        }
                    />
                ))}
            </div>
        </>
    );
}
