import { BrandIconName } from '@/Components/Atoms/BrandIcon/BrandIcon';

export type IntegrationId =
    'discord' | 'slack' | 'github' | 'google-drive' | 'google-calendar';

export interface IntegrationSubOption {
    id: string;
    title: string;
    description: string;
}

export interface IntegrationDefinition {
    id: IntegrationId;
    name: string;
    vendor: string;
    category: string;
    brand: BrandIconName;
    accentClassName: string;
    description: string;
    overview: string;
    subOptions: IntegrationSubOption[];
    /** Only Discord is wired up for now — the rest are shown but locked. */
    comingSoon: boolean;
}

export const INTEGRATIONS: IntegrationDefinition[] = [
    {
        id: 'discord',
        name: 'Discord',
        vendor: 'By Discord Inc.',
        category: 'Communication',
        brand: 'discord',
        accentClassName: 'bg-[#5865F2]/15',
        description:
            'Post issue and project activity straight into your Discord server.',
        overview:
            'Connect a Discord server to mirror activity from Orbit — new issues, status changes, and comments — into the channels your team already watches, so nobody has to context-switch to stay in the loop.',
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
        description:
            'Send notifications and updates directly to your team channels.',
        overview:
            'Connect Slack to route Orbit notifications into the right channels, so teams can react to project activity without leaving their existing workflow.',
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
        id: 'github',
        name: 'GitHub',
        vendor: 'By GitHub, Inc.',
        category: 'Developer tools',
        brand: 'github',
        accentClassName: 'bg-white/10',
        description:
            'Sync pull requests, commits, and linked issue activity automatically.',
        overview:
            'Connect a GitHub repository to link commits and pull requests to Orbit issues, and automatically transition issue status based on merge activity.',
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
        id: 'google-drive',
        name: 'Google Drive',
        vendor: 'By Google LLC',
        category: 'Storage',
        brand: 'google-drive',
        accentClassName: 'bg-[#4285F4]/15',
        description: 'Attach and preview Drive files directly on your issues.',
        overview:
            'Connect Google Drive to attach documents, sheets, and slides to issues and projects, with live previews and permission-aware access for your team.',
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
        id: 'google-calendar',
        name: 'Google Calendar',
        vendor: 'By Google LLC',
        category: 'Productivity',
        brand: 'google-calendar',
        accentClassName: 'bg-[#4285F4]/15',
        description: 'Sync issue due dates and milestones to your calendar.',
        overview:
            'Connect Google Calendar to automatically create events for issue due dates and project milestones, keeping deadlines visible outside of Orbit.',
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
];
