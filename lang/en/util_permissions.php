<?php

declare(strict_types=1);

return [
    'projects_view' => [
        'label' => 'View project',
        'description' => 'See the project and browse its issues.',
    ],
    'projects_create' => [
        'label' => 'Create projects',
        'description' => 'Start new projects in the workspace.',
    ],
    'projects_update' => [
        'label' => 'Edit project',
        'description' => 'Rename, recolor, or reconfigure the project.',
    ],
    'projects_delete' => [
        'label' => 'Delete project',
        'description' => 'Permanently remove the project and its data.',
    ],
    'projects_members_view' => [
        'label' => 'View members',
        'description' => 'See who has access to the project.',
    ],
    'projects_members_invite' => [
        'label' => 'Invite members',
        'description' => 'Send email invitations to join the project.',
    ],
    'projects_members_update' => [
        'label' => 'Manage member roles',
        'description' => 'Change an existing member\'s base role.',
    ],
    'projects_members_delete' => [
        'label' => 'Remove members',
        'description' => 'Revoke a member\'s access to the project.',
    ],
    'projects_roles_view' => [
        'label' => 'View roles',
        'description' => 'See custom roles and what they can do.',
    ],
    'projects_roles_create' => [
        'label' => 'Create roles',
        'description' => 'Define new custom roles for the project.',
    ],
    'projects_roles_update' => [
        'label' => 'Edit roles',
        'description' => 'Rename roles and change their permissions.',
    ],
    'projects_roles_delete' => [
        'label' => 'Delete roles',
        'description' => 'Remove custom roles from the project.',
    ],
    'projects_roles_assign' => [
        'label' => 'Assign roles',
        'description' => 'Grant custom roles to members.',
    ],
    'projects_settings_view' => [
        'label' => 'View settings',
        'description' => 'See project-level configuration.',
    ],
    'projects_settings_update' => [
        'label' => 'Edit settings',
        'description' => 'Change project-level configuration.',
    ],
    'projects_integrations_view' => [
        'label' => 'View integrations',
        'description' => 'See which integrations are connected to the project.',
    ],
    'projects_integrations_update' => [
        'label' => 'Manage integrations',
        'description' => 'Connect, configure, or disconnect third-party integrations.',
    ],
    'projects_automation_view' => [
        'label' => 'View automation rules',
        'description' => 'See the project\'s Settings → Automation rules.',
    ],
    'projects_automation_update' => [
        'label' => 'Manage automation rules',
        'description' => 'Create, edit, enable/disable, or delete automation rules.',
    ],
    'projects_github_development_create' => [
        'label' => 'Create branches & pull requests',
        'description' => 'Create a GitHub branch or pull request from an issue\'s Development panel.',
    ],
    'projects_priorities_view' => [
        'label' => 'View priorities',
        'description' => 'See the project\'s priority scale.',
    ],
    'projects_priorities_create' => [
        'label' => 'Create priorities',
        'description' => 'Add priority levels to the project.',
    ],
    'projects_priorities_update' => [
        'label' => 'Edit priorities',
        'description' => 'Rename, recolor, change the icon, reorder or set the default priority.',
    ],
    'projects_priorities_delete' => [
        'label' => 'Delete priorities',
        'description' => 'Remove priority levels from the project.',
    ],
    'projects_issue_types_view' => [
        'label' => 'View issue types',
        'description' => 'See the project\'s issue type catalog.',
    ],
    'projects_issue_types_create' => [
        'label' => 'Create issue types',
        'description' => 'Define new custom issue types for the project.',
    ],
    'projects_issue_types_update' => [
        'label' => 'Edit issue types',
        'description' => 'Rename, recolor, or reconfigure issue types, including system ones.',
    ],
    'projects_issue_types_delete' => [
        'label' => 'Delete issue types',
        'description' => 'Remove custom issue types from the project.',
    ],
    'projects_issue_types_workflow_update' => [
        'label' => 'Manage workflows',
        'description' => 'Add, remove, or rearrange statuses and transitions for an issue type.',
    ],
    'issues_view' => [
        'label' => 'View issues',
        'description' => 'See issues within the project.',
    ],
    'issues_create' => [
        'label' => 'Create issues',
        'description' => 'Open new issues.',
    ],
    'issues_update' => [
        'label' => 'Edit issues',
        'description' => 'Modify issue titles, descriptions, and details.',
    ],
    'issues_delete' => [
        'label' => 'Delete issues',
        'description' => 'Permanently remove issues.',
    ],
    'issues_assign' => [
        'label' => 'Assign issues',
        'description' => 'Assign issues to members.',
    ],
    'issues_change_status' => [
        'label' => 'Change status',
        'description' => 'Move issues between workflow statuses.',
    ],
    'issues_change_priority' => [
        'label' => 'Change priority',
        'description' => 'Adjust the urgency of an issue.',
    ],
    'issues_change_labels' => [
        'label' => 'Change labels',
        'description' => 'Add or remove labels on an issue.',
    ],
    'comments_create' => [
        'label' => 'Write comments',
        'description' => 'Post comments on issues.',
    ],
    'comments_update_own' => [
        'label' => 'Edit own comments',
        'description' => 'Edit comments the member has written.',
    ],
    'comments_update_any' => [
        'label' => 'Edit any comment',
        'description' => 'Edit comments written by anyone.',
    ],
    'comments_delete_own' => [
        'label' => 'Delete own comments',
        'description' => 'Remove comments the member has written.',
    ],
    'comments_delete_any' => [
        'label' => 'Delete any comment',
        'description' => 'Remove comments written by anyone.',
    ],
    'developer_portal_view' => [
        'label' => 'View developer portal',
        'description' => 'See Developer Portal data. Only available in local development.',
    ],
    'sections' => [
        'members' => 'Members',
        'roles' => 'Roles',
        'settings' => 'Settings',
        'integrations' => 'Integrations',
        'automation' => 'Automation',
        'github' => 'GitHub',
        'priorities' => 'Priorities',
        'issue_types' => 'Issue Types',
        'portal' => 'Portal',
    ],
];
