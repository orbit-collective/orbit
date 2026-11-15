import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsIntegrationDetail from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationDetail';
import { IntegrationId, INTEGRATIONS } from '@/types/Integrations';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { ProjectPriority } from '@/types/Priorities';
import {
    GithubConnectStatus,
    ImportIntegrationSettings,
    IntegrationImportProgress,
    ProjectIntegrationSettings,
} from '@/types/ProjectIntegrations';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsIntegrationDetailProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    integrationId: IntegrationId;
    integrationEnabled?: boolean;
    integrationSettings?: ProjectIntegrationSettings | null;
    jiraSettings?: ImportIntegrationSettings | null;
    jiraImportProgress?: IntegrationImportProgress | null;
    githubConnectStatus?: GithubConnectStatus | null;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
    priorities?: ProjectPriority[];
}

/** One integration's own page, below the Integrations tab. */
export default function SettingsIntegrationDetail({
    projects = [],
    integrationId,
    integrationEnabled = false,
    integrationSettings = null,
    ...detail
}: SettingsIntegrationDetailProps) {
    const integration = INTEGRATIONS.find(({ id }) => id === integrationId);

    if (!integration) return null;

    return (
        <SettingsLayout
            tabId="integrations"
            projects={projects}
            hideTitle
            breadcrumbTrail={[{ label: integration.name }]}
        >
            <WorkspaceSettingsIntegrationDetail
                integration={integration}
                enabled={integrationEnabled}
                settings={integrationSettings}
                {...detail}
            />
        </SettingsLayout>
    );
}
