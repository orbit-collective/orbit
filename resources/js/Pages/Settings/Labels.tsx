import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsLabelsTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsLabelsTab';
import { ProjectLabel } from '@/types/Labels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsLabelsProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    labels?: ProjectLabel[];
    hasLabelsAccess?: boolean;
    canCreateLabels?: boolean;
    canUpdateLabels?: boolean;
    canDeleteLabels?: boolean;
}

export default function SettingsLabels({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    labels = [],
    hasLabelsAccess = false,
    canCreateLabels = false,
    canUpdateLabels = false,
    canDeleteLabels = false,
}: SettingsLabelsProps) {
    return (
        <SettingsLayout tabId="labels" projects={projects}>
            <WorkspaceSettingsLabelsTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                labels={labels}
                hasLabelsAccess={hasLabelsAccess}
                canCreateLabels={canCreateLabels}
                canUpdateLabels={canUpdateLabels}
                canDeleteLabels={canDeleteLabels}
            />
        </SettingsLayout>
    );
}
