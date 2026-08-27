import { PermissionDefinition } from '@/types/Roles';

interface PermissionMeta {
    label: string;
    description: string;
}

const PERMISSION_META: Record<string, PermissionMeta> = {
    'projects.view': {
        label: 'View project',
        description: 'See the project and browse its issues.',
    },
    'projects.create': {
        label: 'Create projects',
        description: 'Start new projects in the workspace.',
    },
    'projects.update': {
        label: 'Edit project',
        description: 'Rename, recolor, or reconfigure the project.',
    },
    'projects.delete': {
        label: 'Delete project',
        description: 'Permanently remove the project and its data.',
    },
    'projects.members.view': {
        label: 'View members',
        description: 'See who has access to the project.',
    },
    'projects.members.invite': {
        label: 'Invite members',
        description: 'Send email invitations to join the project.',
    },
    'projects.members.update': {
        label: 'Manage member roles',
        description: "Change an existing member's base role.",
    },
    'projects.members.delete': {
        label: 'Remove members',
        description: "Revoke a member's access to the project.",
    },
    'projects.roles.view': {
        label: 'View roles',
        description: 'See custom roles and what they can do.',
    },
    'projects.roles.create': {
        label: 'Create roles',
        description: 'Define new custom roles for the project.',
    },
    'projects.roles.update': {
        label: 'Edit roles',
        description: 'Rename roles and change their permissions.',
    },
    'projects.roles.delete': {
        label: 'Delete roles',
        description: 'Remove custom roles from the project.',
    },
    'projects.roles.assign': {
        label: 'Assign roles',
        description: 'Grant custom roles to members.',
    },
    'projects.settings.view': {
        label: 'View settings',
        description: 'See project-level configuration.',
    },
    'projects.settings.update': {
        label: 'Edit settings',
        description: 'Change project-level configuration.',
    },
    'projects.integrations.view': {
        label: 'View integrations',
        description: 'See which integrations are connected to the project.',
    },
    'projects.integrations.update': {
        label: 'Manage integrations',
        description:
            'Connect, configure, or disconnect third-party integrations.',
    },
    'issues.view': {
        label: 'View issues',
        description: 'See issues within the project.',
    },
    'issues.create': {
        label: 'Create issues',
        description: 'Open new issues.',
    },
    'issues.update': {
        label: 'Edit issues',
        description: 'Modify issue titles, descriptions, and details.',
    },
    'issues.delete': {
        label: 'Delete issues',
        description: 'Permanently remove issues.',
    },
    'issues.assign': {
        label: 'Assign issues',
        description: 'Assign issues to members.',
    },
    'issues.change_status': {
        label: 'Change status',
        description: 'Move issues between workflow statuses.',
    },
    'issues.change_priority': {
        label: 'Change priority',
        description: 'Adjust the urgency of an issue.',
    },
    'issues.change_labels': {
        label: 'Change labels',
        description: 'Add or remove labels on an issue.',
    },
    'comments.create': {
        label: 'Write comments',
        description: 'Post comments on issues.',
    },
    'comments.update_own': {
        label: 'Edit own comments',
        description: 'Edit comments the member has written.',
    },
    'comments.update_any': {
        label: 'Edit any comment',
        description: 'Edit comments written by anyone.',
    },
    'comments.delete_own': {
        label: 'Delete own comments',
        description: 'Remove comments the member has written.',
    },
    'comments.delete_any': {
        label: 'Delete any comment',
        description: 'Remove comments written by anyone.',
    },
};

function humanize(value: string): string {
    return value
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function getPermissionLabel(permission: PermissionDefinition): string {
    const meta = PERMISSION_META[permission.key];
    if (meta) {
        return meta.label;
    }

    const last = permission.key.split('.').pop() ?? permission.key;
    return humanize(last);
}

export function getPermissionDescription(
    permission: PermissionDefinition,
): string {
    return PERMISSION_META[permission.key]?.description ?? '';
}

export function getPermissionSection(key: string): string {
    const parts = key.split('.');
    if (parts.length <= 2) {
        return 'General';
    }

    return humanize(parts[1]);
}
