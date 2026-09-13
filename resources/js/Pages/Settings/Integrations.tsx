import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsIntegrationsTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import {
    ImportIntegrationSettings,
    IntegrationImportProgress,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsIntegrationsProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    integrationStatuses?: Record<string, boolean>;
    integrationSettings?: Record<string, ProjectIntegrationSettings>;
    jiraSettings?: ImportIntegrationSettings | null;
    jiraImportProgress?: IntegrationImportProgress | null;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
}

export default function SettingsIntegrations({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    integrationStatuses = {},
    integrationSettings = {},
    jiraSettings = null,
    jiraImportProgress = null,
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
    issueTypes = [],
    labels = [],
}: SettingsIntegrationsProps) {
    return (
        <SettingsLayout tabId="integrations" projects={projects}>
            <WorkspaceSettingsIntegrationsTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                integrationStatuses={integrationStatuses}
                integrationSettings={integrationSettings}
                jiraSettings={jiraSettings}
                jiraImportProgress={jiraImportProgress}
                hasIntegrationsAccess={hasIntegrationsAccess}
                canUpdateIntegrations={canUpdateIntegrations}
                issueTypes={issueTypes}
                labels={labels}
            />
        </SettingsLayout>
    );
}
