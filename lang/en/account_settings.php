<?php

declare(strict_types=1);

return [
    'on' => 'On',
    'off' => 'Off',
    'this_browser_only' => 'Applies to this browser only.',

    'browser' => [
        'denied_alert' => 'Your browser did not allow notifications. Allow them for this site in the browser settings and try again.',
        'title' => 'Browser notifications',
        'description' => 'Get a system notification when something new arrives while Orbit is in a background tab.',
        'row_title' => 'Show notifications on this device',
        'unsupported' => 'This browser does not support notifications.',
        'blocked' => 'Notifications are blocked for this site in your browser settings.',
        'toggle_label' => 'Show browser notifications',
    ],

    'preferences' => [
        'issue_view' => [
            'title' => 'Default issue view',
            'description' => 'Choose how issues open by default across your projects.',
            'summary' => ':view view',
            'views' => [
                'List' => [
                    'name' => 'List',
                    'description' => 'A dense, sortable table of every issue.',
                ],
                'Board' => [
                    'name' => 'Board',
                    'description' => 'Kanban columns grouped by status or priority.',
                ],
                'Calendar' => [
                    'name' => 'Calendar',
                    'description' => 'Issues plotted against their due dates.',
                ],
                'Activity' => [
                    'name' => 'Activity',
                    'description' => 'A chronological feed of all issue activity.',
                ],
            ],
        ],
        'theme' => [
            'title' => 'Interface theme',
            'description' => 'Choose how Orbit should render colors in your account.',
            'options' => [
                'dark' => [
                    'label' => 'Dark',
                    'subtitle' => 'Orbit dark interface',
                ],
                'light' => [
                    'label' => 'Light',
                    'subtitle' => 'Light workspace mode',
                ],
                'system' => [
                    'label' => 'System sync',
                    'subtitle' => 'Follow OS preference',
                ],
            ],
        ],
        'accent' => [
            'title' => 'Accent color',
            'description' => 'Pick the accent used for buttons, links, and highlights - one of the project colors, or any color of your own.',
        ],
        'language' => [
            'title' => 'Language',
            'description' => 'Choose the language Orbit is shown in. The change applies at once, here and in the sidebar menu.',
            'options' => [
                'en' => 'English',
                'pl' => 'Polish',
            ],
        ],
        'reduced_motion' => [
            'title' => 'Reduced Motion',
            'description' => 'Turn off the entrance, hover and transition animations across Orbit. Everything appears instantly.',
        ],
    ],

    'avatar' => [
        'library' => 'Avatar library',
        'library_description' => 'Pick one of the ready-made avatars instead of uploading a photo.',
        'use_face' => 'Use :face avatar',
        'invalid_type' => 'Invalid image. Please upload a JPEG, PNG, or GIF image.',
        'too_large' => 'Image must be smaller than 5 MB.',
        'uploaded' => 'Avatar uploaded successfully.',
        'invalid_file' => 'Invalid image file.',
        'load_failed' => 'Failed to load the image. File might be corrupted.',
        'read_failed' => 'Failed to read the image.',
        'reset_failed' => 'Failed to reset avatar.',
        'choose_aria' => 'Choose an avatar from the library',
        'preview_alt' => 'Avatar preview',
        'upload' => 'Upload new photo',
        'choose' => 'Choose from library',
        'reset' => 'Reset to default',
        'saving' => 'Saving...',
    ],

    'delete_account' => [
        'title' => 'Delete account',
        'deleted' => 'Account has been deleted.',
        'failed' => 'Failed to delete account.',
        'warning' => 'This permanently deletes your account, profile, and all associated data. This action cannot be undone.',
        'consequence_access' => 'You will lose access to every workspace immediately.',
        'consequence_content' => 'Issues and comments you authored will remain, credited to a deleted user.',
        'type_prefix' => 'Type',
        'type_suffix' => 'to confirm',
    ],

    'export' => [
        'title' => 'Export data',
        'description' => 'Generate portable snapshots of your account data.',
        'full_title' => 'Full account export',
        'full_description' => 'Includes profile, preferences, and activity.',
        'full_button' => 'Request export',
        'log_title' => 'Activity log export',
        'log_description' => 'Download a machine-readable archive of activity events.',
        'log_button' => 'Download CSV',
        'privacy_title' => 'Privacy',
        'privacy_description' => 'Control retention and removal of personal account data.',
        'delete_description' => 'Permanently remove your Orbit account and associated content.',
    ],

    'cleanup' => [
        'frequency_options' => [
            'daily' => 'Every day',
            'weekly' => 'Every week',
            'monthly' => 'Every month',
        ],
        'age_days' => ':days days',
        'dont_delete' => 'Don\'t delete',
        'saved' => 'Clean-up schedule saved.',
        'save_failed' => 'Failed to save the clean-up schedule.',
        'purge_failed' => 'Failed to delete the selected data.',
        'last_ran' => 'Last ran :time ago.',
        'not_run' => 'Has not run yet.',
        'title' => 'Automatic clean-up',
        'description' => 'Keep your inbox and history tidy by deleting old items on a schedule.',
        'run_auto' => 'Run clean-up automatically',
        'how_often' => 'How often',
        'how_often_description' => 'The clean-up runs at most once per period.',
        'frequency' => 'Frequency',
        'notifications_older' => 'Delete notifications older than',
        'notification_age' => 'Notification age',
        'keep_unread' => 'Keep unread notifications',
        'keep_unread_description' => 'Only notifications you have already read are deleted.',
        'activity_older' => 'Delete activity history older than',
        'activity_older_description' => 'Removes your own entries from the activity log.',
        'activity_age' => 'Activity age',
        'saving' => 'Saving...',
        'save_schedule' => 'Save schedule',
        'now_title' => 'Clean up now',
        'now_description' => 'Delete old items right away, independent of the schedule.',
        'purge_notifications' => 'Delete old notifications',
        'unread_kept' => 'Unread notifications are kept.',
        'unread_deleted' => 'Unread notifications are deleted too.',
        'purge_activity' => 'Delete old activity history',
        'purge_activity_description' => 'Removes your own activity log entries.',
        'older_than' => 'Older than',
    ],

    'notifications' => [
        'updated' => 'Notification settings updated successfully.',
        'update_failed' => 'Failed to update notification settings.',
        'types_summary' => ':count types',
        'title' => 'Notification types',
        'description' => 'Choose which activity notifies you, and where.',
        'column_type' => 'Type',
        'column_in_app' => 'In-app',
        'column_email' => 'Email',
        'types' => [
            'issue_assigned' => [
                'title' => 'Assigned issues',
                'description' => 'When an issue is assigned or unassigned to you.',
            ],
            'issue_commented' => [
                'title' => 'Comments',
                'description' => 'When an issue you\'re involved in is commented on.',
            ],
            'issue_mentioned' => [
                'title' => 'Mentions',
                'description' => 'When someone mentions you in a comment.',
            ],
            'issue_status_changed' => [
                'title' => 'Status changes',
                'description' => 'When an issue you\'re involved in has its status updated.',
            ],
            'issue_priority_changed' => [
                'title' => 'Priority changes',
                'description' => 'When an issue you\'re involved in has its priority changed.',
            ],
            'issue_labels_changed' => [
                'title' => 'Label updates',
                'description' => 'When labels change on an issue you\'re involved in.',
            ],
            'issue_dates_changed' => [
                'title' => 'Schedule changes',
                'description' => 'When the start or due date changes on an issue you\'re involved in.',
            ],
            'issue_updated' => [
                'title' => 'Other issue updates',
                'description' => 'When any other detail changes on an issue you\'re involved in.',
            ],
            'project_invited' => [
                'title' => 'Project invitations',
                'description' => 'When you are invited to join a new project.',
            ],
            'integration_activity' => [
                'title' => 'Integration activity',
                'description' => 'When an import you started (e.g. from Jira) finishes or fails.',
            ],
        ],
    ],

    'password' => [
        'must_differ' => 'New password must be different from your current password.',
        'mismatch' => 'Passwords do not match.',
        'locked' => 'Too many attempts. Try again in :time.',
        'current' => 'Current password',
        'new' => 'New password',
        'confirm' => 'Confirm new password',
        'hint' => 'Use at least 8 characters with a mix of letters, numbers, and symbols.',
        'update' => 'Update password',
        'set' => 'Set password',
    ],

    'preview' => [
        'sidebar' => 'Sidebar',
        'comment' => 'Comment',
        'issue_row' => 'Issue row',
        'time_ago' => '2m ago',
        'reply' => 'Reply',
    ],

    'profile' => [
        'name_placeholder' => 'Your name',
        'avatar_reset' => 'Avatar reset to default.',
        'avatar_updated' => 'Avatar updated successfully.',
        'avatar_update_failed' => 'Failed to update avatar.',
        'avatar_load_failed' => 'Failed to load the selected avatar.',
        'title' => 'Profile',
        'description' => 'Manage your personal details and how you appear to teammates.',
        'username' => 'Username',
        'username_description' => 'Teammates will see this name and can @mention you with it.',
        'saving' => 'Saving...',
        'unsaved' => 'Unsaved changes',
        'saved' => 'Changes saved',
        'photo' => 'Profile photo',
        'photo_description' => 'This photo will be visible to others across Orbit.',
        'preview_title' => 'Live preview',
        'preview_description' => 'Updates instantly as you edit your photo and name.',
    ],

    'security' => [
        'expiry_updated' => 'Session expiry has been updated.',
        'expiry_failed' => 'Failed to update session expiry.',
        'unlinked' => 'GitHub account unlinked.',
        'unlink_failed' => 'Failed to unlink your GitHub account.',
        'github_summary' => 'GitHub @:username',
        'not_linked' => 'Not linked',
        'accounts_title' => 'Connected accounts',
        'accounts_description' => 'Sign in faster by linking an external account.',
        'github_linked' => 'Linked as @:username. You can also sign in with this GitHub account.',
        'github_unlinked' => 'Link your GitHub account to sign in with it, and to create branches or pull requests from an issue.',
        'unlink_needs_password' => 'Set a password first so you can still sign in after unlinking',
        'unlinking' => 'Unlinking...',
        'unlink' => 'Unlink',
        'link_github' => 'Link GitHub',
        'password_title' => 'Password',
        'password_description' => 'Change your password or send yourself a reset link.',
        'password_description_set' => 'Set a password so you can also sign in without GitHub.',
        'sessions_count' => ':count session|:count sessions',
        'sessions_title' => 'Active sessions',
        'sessions_description' => 'Review and revoke devices currently signed in to your account.',
        'expiry_title' => 'Session expiry',
        'expiry_description' => 'Choose how long you stay signed in before re-authenticating.',
        'timeout' => [
            '1-hour' => [
                'label' => '1 hour',
                'description' => 'Most secure. Re-authenticate frequently.',
            ],
            '8-hours' => [
                'label' => '8 hours',
                'description' => 'Balanced for a typical workday.',
            ],
            '24-hours' => [
                'label' => '24 hours',
                'description' => 'Stay signed in for a full day.',
            ],
            '7-days' => [
                'label' => '7 days',
                'description' => 'Most convenient. Sign in less often.',
            ],
        ],
        'delete_description' => 'Permanently remove your Orbit account and associated data.',
        'delete_row_title' => 'Delete this account',
        'delete_row_description' => 'This action is permanent and cannot be undone.',
    ],

    'sessions' => [
        'signed_out' => 'Signed out of ":ip".',
        'sign_out_failed' => 'Failed to sign out of that session.',
        'signed_out_others' => 'Signed out of all other sessions.',
        'sign_out_others_failed' => 'Failed to sign out of other sessions.',
        'active' => 'Active :time ago · :agent',
        'this_device' => 'This device',
        'revoking' => 'Revoking…',
        'revoke' => 'Revoke',
        'signing_out' => 'Signing out…',
        'sign_out_others' => 'Sign out of all other sessions',
    ],
];
