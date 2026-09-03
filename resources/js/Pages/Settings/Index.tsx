import Breadcrumb from '@/Components/Molecules/Breadcrumb/Breadcrumb';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsContent from '@/Components/Organisms/AccountSettingsContent/AccountSettingsContent';
import Sidebar from '@/Components/Organisms/Sidebar/Sidebar';
import WorkspaceSettingsContent from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsContent';
import { PageProps } from '@/types';
import { NotificationSettings } from '@/types/Notification';
import {
    ImportIntegrationSettings,
    IntegrationImportProgress,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectDetails,
    ProjectMember,
    ProjectMemberRole,
} from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import {
    SETTINGS_TABS,
    getActiveSettingsTab,
    isAccountSettingsTabId,
    isWorkspaceSettingsTabId,
} from '@/types/Settings';
import { Session } from '@/types/Users';
import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

interface SettingsIndexProps {
    projects?: Project[];
    sessions?: Session[];
    notificationSettings?: NotificationSettings;
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    viewerRole?: ProjectMemberRole | null;
    members?: ProjectMember[];
    pendingInvitations?: PendingProjectInvitation[];
    roles?: WorkspaceRole[];
    permissions?: PermissionDefinition[];
    canCreateRoles?: boolean;
    canUpdateRoles?: boolean;
    canDeleteRoles?: boolean;
    canAssignRoles?: boolean;
    hasSettingsAccess?: boolean;
    selectedProjectDetails?: ProjectDetails | null;
    canUpdateProjectDetails?: boolean;
    canDeleteProject?: boolean;
    integrationStatuses?: Record<string, boolean>;
    integrationSettings?: Record<string, ProjectIntegrationSettings>;
    jiraSettings?: ImportIntegrationSettings | null;
    jiraImportProgress?: IntegrationImportProgress | null;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

export default function SettingsIndex({
    projects = [],
    sessions = [],
    notificationSettings,
    memberProjects = [],
    selectedProjectId = null,
    viewerRole = null,
    members = [],
    pendingInvitations = [],
    roles = [],
    permissions = [],
    canCreateRoles = false,
    canUpdateRoles = false,
    canDeleteRoles = false,
    canAssignRoles = false,
    hasSettingsAccess = false,
    selectedProjectDetails = null,
    canUpdateProjectDetails = false,
    canDeleteProject = false,
    integrationStatuses = {},
    integrationSettings = {},
    jiraSettings = null,
    jiraImportProgress = null,
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: SettingsIndexProps) {
    const { url, props } = usePage<PageProps>();
    const userName = props.auth?.user?.name ?? 'John Doe';
    const userAvatar = props.auth?.user?.avatar ?? null;

    const activeTab = useMemo(() => getActiveSettingsTab(url), [url]);

    const activeTabConfig = useMemo(() => {
        return (
            SETTINGS_TABS.find((tab) => tab.id === activeTab) ??
            SETTINGS_TABS[0]
        );
    }, [activeTab]);

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-color)]">
            <Sidebar projects={projects} />

            <div className="m-2 flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-[var(--bg-color-hover)]">
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-10">
                        <header className="space-y-2">
                            <Breadcrumb
                                items={[
                                    {
                                        label: 'Settings',
                                        className: 'uppercase tracking-[0.2em]',
                                    },
                                    { label: activeTabConfig.label },
                                ]}
                            />
                            <h1 className="text-2xl font-semibold text-[var(--text-color)] sm:text-3xl">
                                {activeTabConfig.label}
                            </h1>
                            <p className="max-w-2xl text-sm text-[var(--text-gray-color)]">
                                {activeTabConfig.description}
                            </p>
                        </header>

                        {isAccountSettingsTabId(activeTab) ? (
                            <AccountSettingsContent
                                tabId={activeTab}
                                userName={userName}
                                userAvatar={userAvatar}
                                sessions={sessions}
                                notificationSettings={notificationSettings}
                            />
                        ) : isWorkspaceSettingsTabId(activeTab) ? (
                            <WorkspaceSettingsContent
                                tabId={activeTab}
                                memberProjects={memberProjects}
                                selectedProjectId={selectedProjectId}
                                viewerRole={viewerRole}
                                members={members}
                                pendingInvitations={pendingInvitations}
                                roles={roles}
                                permissions={permissions}
                                canCreateRoles={canCreateRoles}
                                canUpdateRoles={canUpdateRoles}
                                canDeleteRoles={canDeleteRoles}
                                canAssignRoles={canAssignRoles}
                                hasSettingsAccess={hasSettingsAccess}
                                selectedProjectDetails={selectedProjectDetails}
                                canUpdateProjectDetails={
                                    canUpdateProjectDetails
                                }
                                canDeleteProject={canDeleteProject}
                                integrationStatuses={integrationStatuses}
                                integrationSettings={integrationSettings}
                                jiraSettings={jiraSettings}
                                jiraImportProgress={jiraImportProgress}
                                hasIntegrationsAccess={hasIntegrationsAccess}
                                canUpdateIntegrations={canUpdateIntegrations}
                            />
                        ) : (
                            <SettingsPanel
                                title={activeTabConfig.label}
                                description="This section is ready for detailed controls."
                            >
                                <SettingsPanelRow
                                    title="No additional configuration yet"
                                    description="Check back soon for more options in this area."
                                />
                            </SettingsPanel>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
