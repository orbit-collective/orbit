<?php

declare(strict_types=1);

return [
    'discord' => [
        'vendor' => "By Discord Inc.",
        'description' => "Post issue and project activity straight into your Discord server.",
        'overview' => "Connect a Discord server to mirror activity from Orbit — new issues, status changes, and comments — into the channels your team already watches, so nobody has to context-switch to stay in the loop.\n\n**What you get:**\n- Real-time issue and comment activity posted to a channel of your choice\n- Mentions that map Orbit users to their Discord handles\n- No more checking two places for the same update",
        'preview' => [
            'p1' => [
                'title' => "Issue #128 assigned to Jane Cooper",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "New comment on \"Fix login crash\"",
                'time' => "2m ago",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Issue activity",
                'description' => "Post a message when an issue is created, assigned, or resolved.",
            ],
            'comment-activity' => [
                'title' => "Comment activity",
                'description' => "Post a message whenever someone leaves a comment.",
            ],
        ],
    ],
    'slack' => [
        'vendor' => "By Slack Technologies",
        'description' => "Send notifications and updates directly to your team channels.",
        'overview' => "Connect Slack to route Orbit notifications into the right channels, so teams can react to project activity without leaving their existing workflow.\n\n**What you get:**\n- Channel-level routing per project\n- Threaded replies that stay in sync with Orbit comments\n- A slash command to create an issue without leaving Slack",
        'preview' => [
            'p1' => [
                'title' => "Issue #128 assigned to Jane Cooper",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "New comment on \"Fix login crash\"",
                'time' => "2m ago",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Issue activity",
                'description' => "Post a message when an issue is created, assigned, or resolved.",
            ],
            'comment-activity' => [
                'title' => "Comment activity",
                'description' => "Post a message whenever someone leaves a comment.",
            ],
        ],
    ],
    'microsoft-teams' => [
        'vendor' => "By Microsoft Corporation",
        'description' => "Post activity and file updates into your Teams channels.",
        'overview' => "Connect Microsoft Teams to bring issue activity, comments, and file attachments into the channels your organization already relies on for daily standups and reviews.\n\n**What you get:**\n- Adaptive card notifications for issue activity\n- Channel-level routing per project\n- @mentions that map to Teams identities",
        'preview' => [
            'p1' => [
                'title' => "Issue #128 assigned to Jane Cooper",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "New comment on \"Fix login crash\"",
                'time' => "2m ago",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Issue activity",
                'description' => "Post an adaptive card when an issue is created or updated.",
            ],
            'comment-activity' => [
                'title' => "Comment activity",
                'description' => "Post a message whenever someone leaves a comment.",
            ],
        ],
    ],
    'zoom' => [
        'vendor' => "By Zoom Communications",
        'description' => "Attach meeting recordings and notes to related issues.",
        'overview' => "Connect Zoom to link meeting recordings, transcripts, and scheduled calls directly to the issues and projects they relate to, so context never gets lost in someone's calendar.\n\n**What you get:**\n- Attach a recording link to any issue\n- Auto-generated meeting notes summary\n- One-click scheduling from an issue",
        'preview' => [
            'p1' => [
                'title' => "Recording attached to issue #64",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Meeting scheduled for \"Sprint planning\"",
                'time' => "1h ago",
            ],
        ],
        'options' => [
            'meeting-links' => [
                'title' => "Meeting links",
                'description' => "Attach a Zoom meeting link to an issue.",
            ],
            'recording-sync' => [
                'title' => "Recording sync",
                'description' => "Sync recording links back to the issue after a call ends.",
            ],
        ],
    ],
    'telegram' => [
        'vendor' => "By Telegram FZ-LLC",
        'description' => "Get instant issue and comment alerts in a Telegram chat.",
        'overview' => "Connect a Telegram bot to your workspace to receive instant activity alerts in a group chat or DM — a lightweight alternative for teams that live in Telegram.\n\n**What you get:**\n- Instant delivery via a dedicated bot\n- Per-chat routing for different projects\n- Works in group chats and channels",
        'preview' => [
            'p1' => [
                'title' => "Issue #128 assigned to Jane Cooper",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "New comment on \"Fix login crash\"",
                'time' => "2m ago",
            ],
        ],
        'options' => [
            'issue-activity' => [
                'title' => "Issue activity",
                'description' => "Send a message when an issue is created, assigned, or resolved.",
            ],
            'comment-activity' => [
                'title' => "Comment activity",
                'description' => "Send a message whenever someone leaves a comment.",
            ],
        ],
    ],
    'github' => [
        'vendor' => "By GitHub, Inc.",
        'description' => "Link a pull request to an Orbit issue and get a bot comment confirming it.",
        'overview' => "Connect a GitHub repository to link a pull request to an Orbit issue: add a hidden `<!-- orbit-issue:ID -->` marker to the pull request's description, and Orbit links it automatically and replies with a confirmation comment.\n\n**What you get:**\n- Automatic linking from a pull request to the Orbit issue it references\n- A bot comment confirming the link on the pull request\n- The linked pull request shown on the Orbit issue",
        'preview' => [
            'p1' => [
                'title' => "PR #283 linked to issue #12",
                'time' => "Just now",
            ],
        ],
    ],
    'gitlab' => [
        'vendor' => "By GitLab Inc.",
        'description' => "Sync merge requests and pipeline status with linked issues.",
        'overview' => "Connect a GitLab project to link merge requests and pipelines to Orbit issues, keeping delivery status visible without switching tools.\n\n**What you get:**\n- Automatic issue linking from commit and MR descriptions\n- Status transitions when a linked MR merges\n- Pipeline status surfaced directly on the issue",
        'preview' => [
            'p1' => [
                'title' => "MR !18 merged — issue #34 marked as done",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Pipeline passed for issue #34",
                'time' => "10m ago",
            ],
        ],
        'options' => [
            'link-commits' => [
                'title' => "Link commits",
                'description' => "Detect issue references in commit messages.",
            ],
            'pipeline-status' => [
                'title' => "Pipeline status",
                'description' => "Show the latest pipeline result on linked issues.",
            ],
        ],
    ],
    'bitbucket' => [
        'vendor' => "By Atlassian",
        'description' => "Link commits and pull requests from Bitbucket repositories.",
        'overview' => "Connect a Bitbucket repository to link commits and pull requests to Orbit issues, so delivery status stays visible from a single source of truth.\n\n**What you get:**\n- Automatic issue linking from commit messages\n- Status transitions when a linked PR merges\n- A synced activity trail between Bitbucket and Orbit",
        'preview' => [
            'p1' => [
                'title' => "PR #21 merged — issue #45 marked as done",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Commit d4e5f6 references issue #45",
                'time' => "5m ago",
            ],
        ],
        'options' => [
            'link-commits' => [
                'title' => "Link commits",
                'description' => "Detect issue references in commit messages.",
            ],
            'auto-close' => [
                'title' => "Auto-close issues",
                'description' => "Mark issues as done when their linked PR merges.",
            ],
        ],
    ],
    'jira' => [
        'vendor' => "By Atlassian",
        'description' => "Import epics, tasks, and subtasks from a Jira project into Orbit.",
        'overview' => "Connect Jira to pull a project's epics, tasks, and subtasks into Orbit as issues, converting Jira's statuses, priorities, and hierarchy into Orbit's own via a mapping you control.\n\n**What you get:**\n- One-click import of epics, tasks, and subtasks, with hierarchy preserved\n- Configurable status/priority/label mapping to Orbit's fixed set\n- Re-running the import skips issues already imported",
        'preview' => [
            'p1' => [
                'title' => "496 issues imported from Jira project \"Orbit\"",
                'time' => "Just now",
            ],
        ],
    ],
    'sentry' => [
        'vendor' => "By Functional Software, Inc.",
        'description' => "Turn error alerts into issues automatically.",
        'overview' => "Connect Sentry to automatically create an Orbit issue when a new error is detected, with a direct link back to the full stack trace and event history.\n\n**What you get:**\n- Automatic issue creation on new Sentry errors\n- A link to the full stack trace on every linked issue\n- Resolution sync back to Sentry when the issue closes",
        'preview' => [
            'p1' => [
                'title' => "New issue created from Sentry: \"TypeError in checkout\"",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Sentry event count updated on issue #103",
                'time' => "8m ago",
            ],
        ],
        'options' => [
            'auto-create' => [
                'title' => "Auto-create issues",
                'description' => "Create an issue automatically for new Sentry errors.",
            ],
            'resolution-sync' => [
                'title' => "Resolution sync",
                'description' => "Mark the Sentry issue resolved when the linked issue closes.",
            ],
        ],
    ],
    'circleci' => [
        'vendor' => "By Circle Internet Services",
        'description' => "Show build and pipeline status on linked issues.",
        'overview' => "Connect CircleCI to surface build and pipeline status directly on the issues they relate to, so delivery risk is visible without leaving Orbit.\n\n**What you get:**\n- Live pipeline status on linked issues\n- Notifications on build failures for issues in progress\n- A link to the full build log",
        'preview' => [
            'p1' => [
                'title' => "Build passed for issue #58",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Build failed on branch \"fix/checkout-bug\"",
                'time' => "20m ago",
            ],
        ],
        'options' => [
            'pipeline-status' => [
                'title' => "Pipeline status",
                'description' => "Show the latest pipeline result on linked issues.",
            ],
            'failure-alerts' => [
                'title' => "Failure alerts",
                'description' => "Notify the assignee when a linked build fails.",
            ],
        ],
    ],
    'google-drive' => [
        'vendor' => "By Google LLC",
        'description' => "Attach and preview Drive files directly on your issues.",
        'overview' => "Connect Google Drive to attach documents, sheets, and slides to issues and projects, with live previews and permission-aware access for your team.\n\n**What you get:**\n- Inline previews for attached Drive files\n- Automatic view access for project members\n- Files stay in sync with the source in Drive",
        'preview' => [
            'p1' => [
                'title' => "Attached \"Q3-Roadmap.docx\" to issue #56",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "View access granted to 3 project members",
                'time' => "1h ago",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "File previews",
                'description' => "Show inline previews for attached Drive files.",
            ],
            'auto-permissions' => [
                'title' => "Auto-share on attach",
                'description' => "Automatically grant view access to project members.",
            ],
        ],
    ],
    'dropbox' => [
        'vendor' => "By Dropbox, Inc.",
        'description' => "Attach and preview Dropbox files directly on your issues.",
        'overview' => "Connect Dropbox to attach files to issues and projects, with inline previews so reviewers don't have to leave Orbit to check the latest version.\n\n**What you get:**\n- Inline previews for attached Dropbox files\n- Automatic link refresh when a file is updated\n- Shared folder support for whole projects",
        'preview' => [
            'p1' => [
                'title' => "Attached \"Brand-Guidelines.pdf\" to issue #22",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Link refreshed for \"Q3-Budget.xlsx\"",
                'time' => "30m ago",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "File previews",
                'description' => "Show inline previews for attached Dropbox files.",
            ],
            'auto-refresh' => [
                'title' => "Auto-refresh links",
                'description' => "Keep attached file links pointing at the latest version.",
            ],
        ],
    ],
    'microsoft-onedrive' => [
        'vendor' => "By Microsoft Corporation",
        'description' => "Attach and preview OneDrive files directly on your issues.",
        'overview' => "Connect OneDrive to attach documents from your Microsoft 365 workspace to issues and projects, with inline previews for Word, Excel, and PowerPoint files.\n\n**What you get:**\n- Inline previews for attached OneDrive files\n- Automatic view access for project members\n- Works with SharePoint document libraries",
        'preview' => [
            'p1' => [
                'title' => "Attached \"Spec-v2.docx\" to issue #71",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "View access granted to 4 project members",
                'time' => "45m ago",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "File previews",
                'description' => "Show inline previews for attached OneDrive files.",
            ],
            'auto-permissions' => [
                'title' => "Auto-share on attach",
                'description' => "Automatically grant view access to project members.",
            ],
        ],
    ],
    'box' => [
        'vendor' => "By Box, Inc.",
        'description' => "Attach and preview Box files directly on your issues.",
        'overview' => "Connect Box to attach enterprise-managed files to issues and projects, keeping compliance and access controls intact while linking work back to Orbit.\n\n**What you get:**\n- Inline previews for attached Box files\n- Access that respects existing Box permissions\n- Full version history from Box available on the issue",
        'preview' => [
            'p1' => [
                'title' => "Attached \"Contract-Draft.pdf\" to issue #19",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "New version uploaded for \"Onboarding-Guide.pdf\"",
                'time' => "1h ago",
            ],
        ],
        'options' => [
            'file-previews' => [
                'title' => "File previews",
                'description' => "Show inline previews for attached Box files.",
            ],
            'version-history' => [
                'title' => "Version history",
                'description' => "Show the Box version history on the attached file.",
            ],
        ],
    ],
    'google-calendar' => [
        'vendor' => "By Google LLC",
        'description' => "Sync issue due dates and milestones to your calendar.",
        'overview' => "Connect Google Calendar to automatically create events for issue due dates and project milestones, keeping deadlines visible outside of Orbit.\n\n**What you get:**\n- A calendar event for every issue due date\n- Milestone events synced automatically\n- Two-way sync when a due date changes",
        'preview' => [
            'p1' => [
                'title' => "Event created: \"Sprint review\" — Fri 14:00",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Due date synced for issue #91",
                'time' => "3h ago",
            ],
        ],
        'options' => [
            'due-dates' => [
                'title' => "Sync due dates",
                'description' => "Create a calendar event for each issue due date.",
            ],
            'milestones' => [
                'title' => "Sync milestones",
                'description' => "Create calendar events for project milestones.",
            ],
        ],
    ],
    'notion' => [
        'vendor' => "By Notion Labs, Inc.",
        'description' => "Link Notion pages and databases to issues and projects.",
        'overview' => "Connect Notion to link pages and databases to issues and projects, so specs and planning docs stay one click away from the work they describe.\n\n**What you get:**\n- Inline preview of linked Notion pages\n- A two-way link between an issue and its spec\n- Database rows can be created straight from an issue",
        'preview' => [
            'p1' => [
                'title' => "Linked \"Q3 Roadmap\" page to issue #14",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Database row created for issue #14",
                'time' => "2m ago",
            ],
        ],
        'options' => [
            'page-linking' => [
                'title' => "Page linking",
                'description' => "Link a Notion page to an issue with an inline preview.",
            ],
            'database-sync' => [
                'title' => "Database sync",
                'description' => "Create a database row automatically for new issues.",
            ],
        ],
    ],
    'trello' => [
        'vendor' => "By Atlassian",
        'description' => "Sync Orbit issues with Trello cards on a connected board.",
        'overview' => "Connect a Trello board to mirror Orbit issues as cards, for teams that are only partway through migrating their workflow.\n\n**What you get:**\n- A Trello card created for every new issue\n- List-to-status mapping that keeps both boards in sync\n- Comments mirrored in both directions",
        'preview' => [
            'p1' => [
                'title' => "Card created on \"Sprint 12\" board for issue #133",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Card moved to \"Done\" for issue #109",
                'time' => "12m ago",
            ],
        ],
        'options' => [
            'card-sync' => [
                'title' => "Card sync",
                'description' => "Create a Trello card for every new issue.",
            ],
            'status-mapping' => [
                'title' => "List mapping",
                'description' => "Map Trello lists to Orbit statuses.",
            ],
        ],
    ],
    'asana' => [
        'vendor' => "By Asana, Inc.",
        'description' => "Sync tasks and status between Orbit and Asana projects.",
        'overview' => "Connect an Asana project to keep tasks and their status in sync with linked Orbit issues, for teams split across both tools during a migration.\n\n**What you get:**\n- Two-way status sync between Orbit and Asana\n- Assignee and due date mapping\n- Comments mirrored in both directions",
        'preview' => [
            'p1' => [
                'title' => "Task synced from Asana: \"Redesign onboarding flow\"",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Due date updated from Asana for issue #88",
                'time' => "25m ago",
            ],
        ],
        'options' => [
            'status-sync' => [
                'title' => "Status sync",
                'description' => "Keep issue status in sync in both directions.",
            ],
            'due-date-sync' => [
                'title' => "Due date sync",
                'description' => "Keep due dates in sync in both directions.",
            ],
        ],
    ],
    'linear' => [
        'vendor' => "By Linear Orbit, Inc.",
        'description' => "Import and sync issues between Orbit and Linear.",
        'overview' => "Connect Linear to import existing issues or keep two teams working across both tools in sync, without losing history on either side.\n\n**What you get:**\n- One-time or ongoing issue import from Linear\n- Two-way status sync for linked issues\n- Cycle and priority mapping",
        'preview' => [
            'p1' => [
                'title' => "12 issues imported from Linear team \"Core\"",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Status synced from Linear for issue #142",
                'time' => "18m ago",
            ],
        ],
        'options' => [
            'issue-import' => [
                'title' => "Issue import",
                'description' => "Import existing Linear issues into a project.",
            ],
            'status-sync' => [
                'title' => "Status sync",
                'description' => "Keep issue status in sync in both directions.",
            ],
        ],
    ],
    'figma' => [
        'vendor' => "By Figma, Inc.",
        'description' => "Attach Figma files and keep design context on the issue.",
        'overview' => "Connect Figma to attach design files to issues, with an inline frame preview so reviewers always see the latest version without opening Figma.\n\n**What you get:**\n- Inline preview of the linked Figma frame\n- Automatic preview refresh when the design updates\n- Comment threads that link back to the Figma file",
        'preview' => [
            'p1' => [
                'title' => "Linked \"Checkout redesign\" frame to issue #37",
                'time' => "Just now",
            ],
            'p2' => [
                'title' => "Preview refreshed for issue #37",
                'time' => "40m ago",
            ],
        ],
        'options' => [
            'frame-previews' => [
                'title' => "Frame previews",
                'description' => "Show an inline preview of the linked Figma frame.",
            ],
            'auto-refresh' => [
                'title' => "Auto-refresh previews",
                'description' => "Refresh the preview automatically when the design updates.",
            ],
        ],
    ],
];
