import { PermissionDefinition } from '@/types/Roles';
import { getPermissionSection } from '@/utils/permissions';
import { icons } from 'lucide-react';

const GROUP_META: Record<string, { label: string; icon: keyof typeof icons }> =
    {
        projects: { label: 'Project', icon: 'FolderKanban' },
        issues: { label: 'Issues', icon: 'ListTodo' },
        comments: { label: 'Comments', icon: 'MessageSquare' },
    };

export interface PermissionSection {
    section: string;
    permissions: PermissionDefinition[];
}

export interface PermissionGroup {
    group: string;
    label: string;
    icon: keyof typeof icons;
    sections: PermissionSection[];
    permissions: PermissionDefinition[];
}

export function buildPermissionGroups(
    permissions: PermissionDefinition[],
): PermissionGroup[] {
    const groups = new Map<string, PermissionGroup>();

    permissions.forEach((permission) => {
        const meta = GROUP_META[permission.group] ?? {
            label: permission.group,
            icon: 'Key' as keyof typeof icons,
        };

        if (!groups.has(permission.group)) {
            groups.set(permission.group, {
                group: permission.group,
                label: meta.label,
                icon: meta.icon,
                sections: [],
                permissions: [],
            });
        }

        const group = groups.get(permission.group)!;
        group.permissions.push(permission);

        const sectionName = getPermissionSection(permission.key);
        let section = group.sections.find((s) => s.section === sectionName);
        if (!section) {
            section = { section: sectionName, permissions: [] };
            group.sections.push(section);
        }
        section.permissions.push(permission);
    });

    return Array.from(groups.values());
}
