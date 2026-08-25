import { BrandIconName } from '@/Components/Atoms/BrandIcon/BrandIcon';

export type IntegrationId =
    | 'discord'
    | 'slack'
    | 'microsoft-teams'
    | 'zoom'
    | 'telegram'
    | 'github'
    | 'gitlab'
    | 'bitbucket'
    | 'jira'
    | 'sentry'
    | 'circleci'
    | 'google-drive'
    | 'dropbox'
    | 'microsoft-onedrive'
    | 'box'
    | 'google-calendar'
    | 'notion'
    | 'trello'
    | 'asana'
    | 'linear'
    | 'figma';

export type IntegrationCategory =
    'Communication' | 'Developer tools' | 'Storage' | 'Productivity';

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
    'Communication',
    'Developer tools',
    'Storage',
    'Productivity',
];

export interface IntegrationSubOption {
    id: string;
    title: string;
    description: string;
}

export interface IntegrationPreviewSample {
    title: string;
    time: string;
}

export interface IntegrationDefinition {
    id: IntegrationId;
    name: string;
    vendor: string;
    category: IntegrationCategory;
    brand: BrandIconName;
    accentClassName: string;
    /** Official homepage, linked from the detail modal. */
    websiteUrl: string;
    /** Short, plain-text summary shown on the card. */
    description: string;
    /** Longer, markdown-formatted summary shown in the detail modal. */
    overview: string;
    /** Sample activity shown in the detail modal's preview, standing in for a screenshot. */
    previewSamples: IntegrationPreviewSample[];
    subOptions: IntegrationSubOption[];
    /** Only Discord is wired up for now — the rest are shown but locked. */
    comingSoon: boolean;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
    // Communication
    {
        id: 'discord',
        name: 'Discord',
        vendor: 'By Discord Inc.',
        category: 'Communication',
        brand: 'discord',
        accentClassName: 'bg-[#5865F2]/15',
        websiteUrl: 'https://discord.com',
        description:
            'Post issue and project activity straight into your Discord server.',
        overview:
            'Connect a Discord server to mirror activity from Orbit — new issues, status changes, and comments — into the channels your team already watches, so nobody has to context-switch to stay in the loop.\n\n**What you get:**\n- Real-time issue and comment activity posted to a channel of your choice\n- Mentions that map Orbit users to their Discord handles\n- No more checking two places for the same update',
        previewSamples: [
            { title: 'Issue #128 assigned to Jane Cooper', time: 'Just now' },
            { title: 'New comment on "Fix login crash"', time: '2m ago' },
        ],
        subOptions: [
            {
                id: 'issue-activity',
                title: 'Issue activity',
                description:
                    'Post a message when an issue is created, assigned, or resolved.',
            },
            {
                id: 'comment-activity',
                title: 'Comment activity',
                description:
                    'Post a message whenever someone leaves a comment.',
            },
        ],
        comingSoon: false,
    },
    {
        id: 'slack',
        name: 'Slack',
        vendor: 'By Slack Technologies',
        category: 'Communication',
        brand: 'slack',
        accentClassName: 'bg-[#4A154B]/15',
        websiteUrl: 'https://slack.com',
        description:
            'Send notifications and updates directly to your team channels.',
        overview:
            'Connect Slack to route Orbit notifications into the right channels, so teams can react to project activity without leaving their existing workflow.\n\n**What you get:**\n- Channel-level routing per project\n- Threaded replies that stay in sync with Orbit comments\n- A slash command to create an issue without leaving Slack',
        previewSamples: [
            { title: 'Issue #128 assigned to Jane Cooper', time: 'Just now' },
            { title: 'New comment on "Fix login crash"', time: '2m ago' },
        ],
        subOptions: [
            {
                id: 'issue-activity',
                title: 'Issue activity',
                description:
                    'Post a message when an issue is created, assigned, or resolved.',
            },
            {
                id: 'comment-activity',
                title: 'Comment activity',
                description:
                    'Post a message whenever someone leaves a comment.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'microsoft-teams',
        name: 'Microsoft Teams',
        vendor: 'By Microsoft Corporation',
        category: 'Communication',
        brand: 'microsoft-teams',
        accentClassName: 'bg-[#6264A7]/15',
        websiteUrl: 'https://www.microsoft.com/microsoft-teams',
        description: 'Post activity and file updates into your Teams channels.',
        overview:
            'Connect Microsoft Teams to bring issue activity, comments, and file attachments into the channels your organization already relies on for daily standups and reviews.\n\n**What you get:**\n- Adaptive card notifications for issue activity\n- Channel-level routing per project\n- @mentions that map to Teams identities',
        previewSamples: [
            { title: 'Issue #128 assigned to Jane Cooper', time: 'Just now' },
            { title: 'New comment on "Fix login crash"', time: '2m ago' },
        ],
        subOptions: [
            {
                id: 'issue-activity',
                title: 'Issue activity',
                description:
                    'Post an adaptive card when an issue is created or updated.',
            },
            {
                id: 'comment-activity',
                title: 'Comment activity',
                description:
                    'Post a message whenever someone leaves a comment.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'zoom',
        name: 'Zoom',
        vendor: 'By Zoom Communications',
        category: 'Communication',
        brand: 'zoom',
        accentClassName: 'bg-[#0B5CFF]/15',
        websiteUrl: 'https://zoom.us',
        description: 'Attach meeting recordings and notes to related issues.',
        overview:
            "Connect Zoom to link meeting recordings, transcripts, and scheduled calls directly to the issues and projects they relate to, so context never gets lost in someone's calendar.\n\n**What you get:**\n- Attach a recording link to any issue\n- Auto-generated meeting notes summary\n- One-click scheduling from an issue",
        previewSamples: [
            { title: 'Recording attached to issue #64', time: 'Just now' },
            {
                title: 'Meeting scheduled for "Sprint planning"',
                time: '1h ago',
            },
        ],
        subOptions: [
            {
                id: 'meeting-links',
                title: 'Meeting links',
                description: 'Attach a Zoom meeting link to an issue.',
            },
            {
                id: 'recording-sync',
                title: 'Recording sync',
                description:
                    'Sync recording links back to the issue after a call ends.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'telegram',
        name: 'Telegram',
        vendor: 'By Telegram FZ-LLC',
        category: 'Communication',
        brand: 'telegram',
        accentClassName: 'bg-[#26A5E4]/15',
        websiteUrl: 'https://telegram.org',
        description: 'Get instant issue and comment alerts in a Telegram chat.',
        overview:
            'Connect a Telegram bot to your workspace to receive instant activity alerts in a group chat or DM — a lightweight alternative for teams that live in Telegram.\n\n**What you get:**\n- Instant delivery via a dedicated bot\n- Per-chat routing for different projects\n- Works in group chats and channels',
        previewSamples: [
            { title: 'Issue #128 assigned to Jane Cooper', time: 'Just now' },
            { title: 'New comment on "Fix login crash"', time: '2m ago' },
        ],
        subOptions: [
            {
                id: 'issue-activity',
                title: 'Issue activity',
                description:
                    'Send a message when an issue is created, assigned, or resolved.',
            },
            {
                id: 'comment-activity',
                title: 'Comment activity',
                description:
                    'Send a message whenever someone leaves a comment.',
            },
        ],
        comingSoon: true,
    },

    // Developer tools
    {
        id: 'github',
        name: 'GitHub',
        vendor: 'By GitHub, Inc.',
        category: 'Developer tools',
        brand: 'github',
        accentClassName: 'bg-white/10',
        websiteUrl: 'https://github.com',
        description:
            'Sync pull requests, commits, and linked issue activity automatically.',
        overview:
            'Connect a GitHub repository to link commits and pull requests to Orbit issues, and automatically transition issue status based on merge activity.\n\n**What you get:**\n- Automatic issue linking from commit messages and PR descriptions\n- Status transitions when a linked PR merges\n- A synced activity trail between GitHub and Orbit',
        previewSamples: [
            {
                title: 'PR #42 merged — issue #12 marked as done',
                time: 'Just now',
            },
            { title: 'Commit a1b2c3d references issue #87', time: '5m ago' },
        ],
        subOptions: [
            {
                id: 'link-commits',
                title: 'Link commits',
                description: 'Detect issue references in commit messages.',
            },
            {
                id: 'auto-close',
                title: 'Auto-close issues',
                description: 'Mark issues as done when their linked PR merges.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'gitlab',
        name: 'GitLab',
        vendor: 'By GitLab Inc.',
        category: 'Developer tools',
        brand: 'gitlab',
        accentClassName: 'bg-[#FC6D26]/15',
        websiteUrl: 'https://gitlab.com',
        description:
            'Sync merge requests and pipeline status with linked issues.',
        overview:
            'Connect a GitLab project to link merge requests and pipelines to Orbit issues, keeping delivery status visible without switching tools.\n\n**What you get:**\n- Automatic issue linking from commit and MR descriptions\n- Status transitions when a linked MR merges\n- Pipeline status surfaced directly on the issue',
        previewSamples: [
            {
                title: 'MR !18 merged — issue #34 marked as done',
                time: 'Just now',
            },
            { title: 'Pipeline passed for issue #34', time: '10m ago' },
        ],
        subOptions: [
            {
                id: 'link-commits',
                title: 'Link commits',
                description: 'Detect issue references in commit messages.',
            },
            {
                id: 'pipeline-status',
                title: 'Pipeline status',
                description:
                    'Show the latest pipeline result on linked issues.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'bitbucket',
        name: 'Bitbucket',
        vendor: 'By Atlassian',
        category: 'Developer tools',
        brand: 'bitbucket',
        accentClassName: 'bg-[#0052CC]/15',
        websiteUrl: 'https://bitbucket.org',
        description:
            'Link commits and pull requests from Bitbucket repositories.',
        overview:
            'Connect a Bitbucket repository to link commits and pull requests to Orbit issues, so delivery status stays visible from a single source of truth.\n\n**What you get:**\n- Automatic issue linking from commit messages\n- Status transitions when a linked PR merges\n- A synced activity trail between Bitbucket and Orbit',
        previewSamples: [
            {
                title: 'PR #21 merged — issue #45 marked as done',
                time: 'Just now',
            },
            { title: 'Commit d4e5f6 references issue #45', time: '5m ago' },
        ],
        subOptions: [
            {
                id: 'link-commits',
                title: 'Link commits',
                description: 'Detect issue references in commit messages.',
            },
            {
                id: 'auto-close',
                title: 'Auto-close issues',
                description: 'Mark issues as done when their linked PR merges.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'jira',
        name: 'Jira',
        vendor: 'By Atlassian',
        category: 'Developer tools',
        brand: 'jira',
        accentClassName: 'bg-[#0052CC]/15',
        websiteUrl: 'https://www.atlassian.com/software/jira',
        description: 'Two-way sync issue status and fields with Jira.',
        overview:
            "Connect Jira to keep a linked Jira issue's status, assignee, and priority in sync with its Orbit counterpart, for teams migrating gradually or working across both tools.\n\n**What you get:**\n- Two-way status sync between Orbit and Jira\n- Field mapping for priority and assignee\n- A link back to the Jira issue from Orbit",
        previewSamples: [
            {
                title: 'Issue #77 status synced from Jira: "In Review"',
                time: 'Just now',
            },
            { title: 'Priority updated to "High" from Jira', time: '15m ago' },
        ],
        subOptions: [
            {
                id: 'status-sync',
                title: 'Status sync',
                description: 'Keep issue status in sync in both directions.',
            },
            {
                id: 'field-mapping',
                title: 'Field mapping',
                description:
                    'Map priority and assignee fields between the two tools.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'sentry',
        name: 'Sentry',
        vendor: 'By Functional Software, Inc.',
        category: 'Developer tools',
        brand: 'sentry',
        accentClassName: 'bg-[#362D59]/15',
        websiteUrl: 'https://sentry.io',
        description: 'Turn error alerts into issues automatically.',
        overview:
            'Connect Sentry to automatically create an Orbit issue when a new error is detected, with a direct link back to the full stack trace and event history.\n\n**What you get:**\n- Automatic issue creation on new Sentry errors\n- A link to the full stack trace on every linked issue\n- Resolution sync back to Sentry when the issue closes',
        previewSamples: [
            {
                title: 'New issue created from Sentry: "TypeError in checkout"',
                time: 'Just now',
            },
            {
                title: 'Sentry event count updated on issue #103',
                time: '8m ago',
            },
        ],
        subOptions: [
            {
                id: 'auto-create',
                title: 'Auto-create issues',
                description:
                    'Create an issue automatically for new Sentry errors.',
            },
            {
                id: 'resolution-sync',
                title: 'Resolution sync',
                description:
                    'Mark the Sentry issue resolved when the linked issue closes.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'circleci',
        name: 'CircleCI',
        vendor: 'By Circle Internet Services',
        category: 'Developer tools',
        brand: 'circleci',
        accentClassName: 'bg-white/10',
        websiteUrl: 'https://circleci.com',
        description: 'Show build and pipeline status on linked issues.',
        overview:
            'Connect CircleCI to surface build and pipeline status directly on the issues they relate to, so delivery risk is visible without leaving Orbit.\n\n**What you get:**\n- Live pipeline status on linked issues\n- Notifications on build failures for issues in progress\n- A link to the full build log',
        previewSamples: [
            { title: 'Build passed for issue #58', time: 'Just now' },
            {
                title: 'Build failed on branch "fix/checkout-bug"',
                time: '20m ago',
            },
        ],
        subOptions: [
            {
                id: 'pipeline-status',
                title: 'Pipeline status',
                description:
                    'Show the latest pipeline result on linked issues.',
            },
            {
                id: 'failure-alerts',
                title: 'Failure alerts',
                description: 'Notify the assignee when a linked build fails.',
            },
        ],
        comingSoon: true,
    },

    // Storage
    {
        id: 'google-drive',
        name: 'Google Drive',
        vendor: 'By Google LLC',
        category: 'Storage',
        brand: 'google-drive',
        accentClassName: 'bg-[#4285F4]/15',
        websiteUrl: 'https://drive.google.com',
        description: 'Attach and preview Drive files directly on your issues.',
        overview:
            'Connect Google Drive to attach documents, sheets, and slides to issues and projects, with live previews and permission-aware access for your team.\n\n**What you get:**\n- Inline previews for attached Drive files\n- Automatic view access for project members\n- Files stay in sync with the source in Drive',
        previewSamples: [
            {
                title: 'Attached "Q3-Roadmap.docx" to issue #56',
                time: 'Just now',
            },
            {
                title: 'View access granted to 3 project members',
                time: '1h ago',
            },
        ],
        subOptions: [
            {
                id: 'file-previews',
                title: 'File previews',
                description: 'Show inline previews for attached Drive files.',
            },
            {
                id: 'auto-permissions',
                title: 'Auto-share on attach',
                description:
                    'Automatically grant view access to project members.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'dropbox',
        name: 'Dropbox',
        vendor: 'By Dropbox, Inc.',
        category: 'Storage',
        brand: 'dropbox',
        accentClassName: 'bg-[#0061FF]/15',
        websiteUrl: 'https://www.dropbox.com',
        description:
            'Attach and preview Dropbox files directly on your issues.',
        overview:
            "Connect Dropbox to attach files to issues and projects, with inline previews so reviewers don't have to leave Orbit to check the latest version.\n\n**What you get:**\n- Inline previews for attached Dropbox files\n- Automatic link refresh when a file is updated\n- Shared folder support for whole projects",
        previewSamples: [
            {
                title: 'Attached "Brand-Guidelines.pdf" to issue #22',
                time: 'Just now',
            },
            { title: 'Link refreshed for "Q3-Budget.xlsx"', time: '30m ago' },
        ],
        subOptions: [
            {
                id: 'file-previews',
                title: 'File previews',
                description: 'Show inline previews for attached Dropbox files.',
            },
            {
                id: 'auto-refresh',
                title: 'Auto-refresh links',
                description:
                    'Keep attached file links pointing at the latest version.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'microsoft-onedrive',
        name: 'Microsoft OneDrive',
        vendor: 'By Microsoft Corporation',
        category: 'Storage',
        brand: 'microsoft-onedrive',
        accentClassName: 'bg-[#0078D4]/15',
        websiteUrl: 'https://onedrive.live.com',
        description:
            'Attach and preview OneDrive files directly on your issues.',
        overview:
            'Connect OneDrive to attach documents from your Microsoft 365 workspace to issues and projects, with inline previews for Word, Excel, and PowerPoint files.\n\n**What you get:**\n- Inline previews for attached OneDrive files\n- Automatic view access for project members\n- Works with SharePoint document libraries',
        previewSamples: [
            { title: 'Attached "Spec-v2.docx" to issue #71', time: 'Just now' },
            {
                title: 'View access granted to 4 project members',
                time: '45m ago',
            },
        ],
        subOptions: [
            {
                id: 'file-previews',
                title: 'File previews',
                description:
                    'Show inline previews for attached OneDrive files.',
            },
            {
                id: 'auto-permissions',
                title: 'Auto-share on attach',
                description:
                    'Automatically grant view access to project members.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'box',
        name: 'Box',
        vendor: 'By Box, Inc.',
        category: 'Storage',
        brand: 'box',
        accentClassName: 'bg-[#0061D5]/15',
        websiteUrl: 'https://www.box.com',
        description: 'Attach and preview Box files directly on your issues.',
        overview:
            'Connect Box to attach enterprise-managed files to issues and projects, keeping compliance and access controls intact while linking work back to Orbit.\n\n**What you get:**\n- Inline previews for attached Box files\n- Access that respects existing Box permissions\n- Full version history from Box available on the issue',
        previewSamples: [
            {
                title: 'Attached "Contract-Draft.pdf" to issue #19',
                time: 'Just now',
            },
            {
                title: 'New version uploaded for "Onboarding-Guide.pdf"',
                time: '1h ago',
            },
        ],
        subOptions: [
            {
                id: 'file-previews',
                title: 'File previews',
                description: 'Show inline previews for attached Box files.',
            },
            {
                id: 'version-history',
                title: 'Version history',
                description:
                    'Show the Box version history on the attached file.',
            },
        ],
        comingSoon: true,
    },

    // Productivity
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        vendor: 'By Google LLC',
        category: 'Productivity',
        brand: 'google-calendar',
        accentClassName: 'bg-[#4285F4]/15',
        websiteUrl: 'https://calendar.google.com',
        description: 'Sync issue due dates and milestones to your calendar.',
        overview:
            'Connect Google Calendar to automatically create events for issue due dates and project milestones, keeping deadlines visible outside of Orbit.\n\n**What you get:**\n- A calendar event for every issue due date\n- Milestone events synced automatically\n- Two-way sync when a due date changes',
        previewSamples: [
            {
                title: 'Event created: "Sprint review" — Fri 14:00',
                time: 'Just now',
            },
            { title: 'Due date synced for issue #91', time: '3h ago' },
        ],
        subOptions: [
            {
                id: 'due-dates',
                title: 'Sync due dates',
                description: 'Create a calendar event for each issue due date.',
            },
            {
                id: 'milestones',
                title: 'Sync milestones',
                description: 'Create calendar events for project milestones.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'notion',
        name: 'Notion',
        vendor: 'By Notion Labs, Inc.',
        category: 'Productivity',
        brand: 'notion',
        accentClassName: 'bg-white/10',
        websiteUrl: 'https://www.notion.so',
        description: 'Link Notion pages and databases to issues and projects.',
        overview:
            'Connect Notion to link pages and databases to issues and projects, so specs and planning docs stay one click away from the work they describe.\n\n**What you get:**\n- Inline preview of linked Notion pages\n- A two-way link between an issue and its spec\n- Database rows can be created straight from an issue',
        previewSamples: [
            {
                title: 'Linked "Q3 Roadmap" page to issue #14',
                time: 'Just now',
            },
            { title: 'Database row created for issue #14', time: '2m ago' },
        ],
        subOptions: [
            {
                id: 'page-linking',
                title: 'Page linking',
                description:
                    'Link a Notion page to an issue with an inline preview.',
            },
            {
                id: 'database-sync',
                title: 'Database sync',
                description:
                    'Create a database row automatically for new issues.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'trello',
        name: 'Trello',
        vendor: 'By Atlassian',
        category: 'Productivity',
        brand: 'trello',
        accentClassName: 'bg-[#0052CC]/15',
        websiteUrl: 'https://trello.com',
        description:
            'Sync Orbit issues with Trello cards on a connected board.',
        overview:
            'Connect a Trello board to mirror Orbit issues as cards, for teams that are only partway through migrating their workflow.\n\n**What you get:**\n- A Trello card created for every new issue\n- List-to-status mapping that keeps both boards in sync\n- Comments mirrored in both directions',
        previewSamples: [
            {
                title: 'Card created on "Sprint 12" board for issue #133',
                time: 'Just now',
            },
            { title: 'Card moved to "Done" for issue #109', time: '12m ago' },
        ],
        subOptions: [
            {
                id: 'card-sync',
                title: 'Card sync',
                description: 'Create a Trello card for every new issue.',
            },
            {
                id: 'status-mapping',
                title: 'List mapping',
                description: 'Map Trello lists to Orbit statuses.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'asana',
        name: 'Asana',
        vendor: 'By Asana, Inc.',
        category: 'Productivity',
        brand: 'asana',
        accentClassName: 'bg-[#F06A6A]/15',
        websiteUrl: 'https://asana.com',
        description: 'Sync tasks and status between Orbit and Asana projects.',
        overview:
            'Connect an Asana project to keep tasks and their status in sync with linked Orbit issues, for teams split across both tools during a migration.\n\n**What you get:**\n- Two-way status sync between Orbit and Asana\n- Assignee and due date mapping\n- Comments mirrored in both directions',
        previewSamples: [
            {
                title: 'Task synced from Asana: "Redesign onboarding flow"',
                time: 'Just now',
            },
            {
                title: 'Due date updated from Asana for issue #88',
                time: '25m ago',
            },
        ],
        subOptions: [
            {
                id: 'status-sync',
                title: 'Status sync',
                description: 'Keep issue status in sync in both directions.',
            },
            {
                id: 'due-date-sync',
                title: 'Due date sync',
                description: 'Keep due dates in sync in both directions.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'linear',
        name: 'Linear',
        vendor: 'By Linear Orbit, Inc.',
        category: 'Productivity',
        brand: 'linear',
        accentClassName: 'bg-[#5E6AD2]/15',
        websiteUrl: 'https://linear.app',
        description: 'Import and sync issues between Orbit and Linear.',
        overview:
            'Connect Linear to import existing issues or keep two teams working across both tools in sync, without losing history on either side.\n\n**What you get:**\n- One-time or ongoing issue import from Linear\n- Two-way status sync for linked issues\n- Cycle and priority mapping',
        previewSamples: [
            {
                title: '12 issues imported from Linear team "Core"',
                time: 'Just now',
            },
            {
                title: 'Status synced from Linear for issue #142',
                time: '18m ago',
            },
        ],
        subOptions: [
            {
                id: 'issue-import',
                title: 'Issue import',
                description: 'Import existing Linear issues into a project.',
            },
            {
                id: 'status-sync',
                title: 'Status sync',
                description: 'Keep issue status in sync in both directions.',
            },
        ],
        comingSoon: true,
    },
    {
        id: 'figma',
        name: 'Figma',
        vendor: 'By Figma, Inc.',
        category: 'Productivity',
        brand: 'figma',
        accentClassName: 'bg-[#F24E1E]/15',
        websiteUrl: 'https://www.figma.com',
        description: 'Attach Figma files and keep design context on the issue.',
        overview:
            'Connect Figma to attach design files to issues, with an inline frame preview so reviewers always see the latest version without opening Figma.\n\n**What you get:**\n- Inline preview of the linked Figma frame\n- Automatic preview refresh when the design updates\n- Comment threads that link back to the Figma file',
        previewSamples: [
            {
                title: 'Linked "Checkout redesign" frame to issue #37',
                time: 'Just now',
            },
            { title: 'Preview refreshed for issue #37', time: '40m ago' },
        ],
        subOptions: [
            {
                id: 'frame-previews',
                title: 'Frame previews',
                description:
                    'Show an inline preview of the linked Figma frame.',
            },
            {
                id: 'auto-refresh',
                title: 'Auto-refresh previews',
                description:
                    'Refresh the preview automatically when the design updates.',
            },
        ],
        comingSoon: true,
    },
];
