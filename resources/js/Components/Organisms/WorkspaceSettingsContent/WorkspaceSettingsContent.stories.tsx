import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
    issueTypes,
    labels,
    priorities,
    projects,
    users,
} from '@/stories/fixtures';
import { AutomationOption, AutomationRule } from '@/types/Automation';
import { ProjectIntegrationSettings } from '@/types/ProjectIntegrations';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectMember,
} from '@/types/ProjectMembers';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import WorkspaceSettingsAutomationTab from './WorkspaceSettingsAutomationTab';
import WorkspaceSettingsDocumentsTab from './WorkspaceSettingsDocumentsTab';
import WorkspaceSettingsIntegrationsTab from './WorkspaceSettingsIntegrationsTab';
import WorkspaceSettingsIssueTypesTab from './WorkspaceSettingsIssueTypesTab';
import WorkspaceSettingsLabelsTab from './WorkspaceSettingsLabelsTab';
import WorkspaceSettingsMembersTab from './WorkspaceSettingsMembersTab';
import WorkspaceSettingsPrioritiesTab from './WorkspaceSettingsPrioritiesTab';
import WorkspaceSettingsRolesTab from './WorkspaceSettingsRolesTab';

const daysFromNow = (days: number) =>
    new Date(Date.now() + days * 86_400_000).toISOString();

const memberProjects: MemberProjectSummary[] = projects.map(
    ({ id, name, color }) => ({ id, name, color }),
);

const projectScope = { memberProjects, selectedProjectId: 1 };

const roles: WorkspaceRole[] = [
    {
        id: 1,
        name: 'Owner',
        slug: 'owner',
        type: 'owner',
        isSystem: true,
        memberCount: 1,
        permissionIds: [1, 2, 3, 4],
    },
    {
        id: 2,
        name: 'Admin',
        slug: 'admin',
        type: 'admin',
        isSystem: true,
        memberCount: 1,
        permissionIds: [1, 2, 3],
    },
    {
        id: 3,
        name: 'Member',
        slug: 'member',
        type: 'member',
        isSystem: true,
        memberCount: 2,
        permissionIds: [1, 2],
    },
    {
        id: 4,
        name: 'QA Reviewer',
        slug: 'qa-reviewer',
        type: 'custom',
        isSystem: false,
        memberCount: 1,
        permissionIds: [1],
    },
];

const permissions: PermissionDefinition[] = [
    { id: 1, key: 'issues.view', group: 'Issues' },
    { id: 2, key: 'issues.create', group: 'Issues' },
    { id: 3, key: 'labels.manage', group: 'Labels' },
    { id: 4, key: 'project.delete', group: 'Project' },
];

const members: ProjectMember[] = users.map((user, index) => ({
    id: user.id,
    name: user.name,
    email: `${user.name.split(' ')[0].toLowerCase()}@orbit.dev`,
    avatar: null,
    role: (['owner', 'admin', 'member', 'viewer'] as const)[index],
    joinedAt: daysFromNow(-30 * (index + 1)),
    roleIds: [roles[Math.min(index, 2)].id],
}));

const pendingInvitations: PendingProjectInvitation[] = [
    {
        id: 1,
        email: 'new.hire@orbit.dev',
        role: 'member',
        roleIds: [3],
        invitedByName: 'Jane Cooper',
        expiresAt: daysFromNow(5),
    },
];

const triggerTypes: AutomationOption[] = [
    { value: 'issue_created', label: 'Issue created' },
    { value: 'status_changed', label: 'Status changed' },
];

const actionTypes: AutomationOption[] = [
    { value: 'change_priority', label: 'Change priority' },
    { value: 'send_notification', label: 'Send notification' },
];

const automationRules: AutomationRule[] = [
    {
        id: 1,
        name: 'Escalate new bugs',
        triggerType: 'issue_created',
        enabled: true,
        conditions: [{ field: 'type', operator: 'equals', value: 'bug' }],
        actions: [{ type: 'change_priority', params: { priority: 'high' } }],
    },
];

const discordSettings: Record<string, ProjectIntegrationSettings> = {
    discord: {
        enabled: true,
        hasWebhookUrl: true,
        webhookUrl: 'https://discord.com/api/webhooks/123/abc',
        options: { 'issue-activity': true, 'comment-activity': false },
    },
};

const meta = {
    title: 'Organisms/WorkspaceSettingsContent',
    parameters: { layout: 'padded', inertia: { url: '/settings/labels' } },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-3xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const settingsPriorities = priorities.map((priority, index) => ({
    ...priority,
    issueCount: [4, 9, 2][index],
}));

export const Labels: Story = {
    render: () => (
        <WorkspaceSettingsLabelsTab
            {...projectScope}
            labels={labels}
            hasLabelsAccess
            canCreateLabels
            canUpdateLabels
            canDeleteLabels
        />
    ),
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText('bug'),
        ).toBeVisible();
    },
};

export const LabelsReadOnly: Story = {
    render: () => (
        <WorkspaceSettingsLabelsTab
            {...projectScope}
            labels={labels}
            hasLabelsAccess
        />
    ),
};

export const LabelsNoAccess: Story = {
    render: () => <WorkspaceSettingsLabelsTab {...projectScope} />,
};

export const IssueTypes: Story = {
    render: () => (
        <WorkspaceSettingsIssueTypesTab
            {...projectScope}
            issueTypes={issueTypes}
            labels={labels}
            hasIssueTypesAccess
            canCreateIssueTypes
            canUpdateIssueTypes
            canDeleteIssueTypes
            canUpdateWorkflow
        />
    ),
};

export const Members: Story = {
    render: () => (
        <WorkspaceSettingsMembersTab
            {...projectScope}
            canInviteMembers
            canUpdateMemberRoles
            canRemoveMembers
            canTransferOwnership
            members={members}
            pendingInvitations={pendingInvitations}
            roles={roles}
            canAssignRoles
            selectedProjectDetails={{
                name: 'Orbit',
                description: 'The issue tracker itself.',
                color: 'purple',
            }}
            canUpdateProjectDetails
            canDeleteProject
        />
    ),
};

export const MembersAsViewer: Story = {
    render: () => (
        <WorkspaceSettingsMembersTab
            {...projectScope}
            members={members}
            roles={roles}
        />
    ),
};

export const Roles: Story = {
    render: () => (
        <WorkspaceSettingsRolesTab
            {...projectScope}
            roles={roles}
            permissions={permissions}
            canCreateRoles
            canUpdateRoles
            canDeleteRoles
            hasSettingsAccess
        />
    ),
};

export const Integrations: Story = {
    render: () => (
        <WorkspaceSettingsIntegrationsTab
            {...projectScope}
            integrationStatuses={{ discord: true }}
            integrationSettings={discordSettings}
            issueTypes={issueTypes}
            labels={labels}
            hasIntegrationsAccess
            canUpdateIntegrations
        />
    ),
};

export const Automation: Story = {
    render: () => (
        <WorkspaceSettingsAutomationTab
            {...projectScope}
            automationRules={automationRules}
            triggerTypes={triggerTypes}
            actionTypes={actionTypes}
            hasAutomationAccess
            canUpdateAutomation
        />
    ),
};

export const Priorities: Story = {
    render: () => (
        <WorkspaceSettingsPrioritiesTab
            {...projectScope}
            priorities={settingsPriorities}
            hasPrioritiesAccess
            canCreatePriorities
            canUpdatePriorities
            canDeletePriorities
        />
    ),
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText('9 issues'),
        ).toBeVisible();
    },
};

export const PrioritiesReadOnly: Story = {
    render: () => (
        <WorkspaceSettingsPrioritiesTab
            {...projectScope}
            priorities={settingsPriorities}
            hasPrioritiesAccess
        />
    ),
};

export const Documents: Story = {
    render: () => <WorkspaceSettingsDocumentsTab />,
};
