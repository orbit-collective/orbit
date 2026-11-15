import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsIntegrationsTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIntegrationsTab';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsIntegrationsProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    integrationStatuses?: Record<string, boolean>;
    hasIntegrationsAccess?: boolean;
    canUpdateIntegrations?: boolean;
}

export default function SettingsIntegrations({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    integrationStatuses = {},
    hasIntegrationsAccess = false,
    canUpdateIntegrations = false,
}: SettingsIntegrationsProps) {
    return (
        <SettingsLayout tabId="integrations" projects={projects}>
            <WorkspaceSettingsIntegrationsTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                integrationStatuses={integrationStatuses}
                hasIntegrationsAccess={hasIntegrationsAccess}
                canUpdateIntegrations={canUpdateIntegrations}
            />
        </SettingsLayout>
    );
}
