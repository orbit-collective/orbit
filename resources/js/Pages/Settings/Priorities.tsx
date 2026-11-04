import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsPrioritiesTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsPrioritiesTab';
import { useSettingsLive } from '@/live/useSettingsLive';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsPrioritiesProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    priorities?: SettingsPriority[];
    hasPrioritiesAccess?: boolean;
    canCreatePriorities?: boolean;
    canUpdatePriorities?: boolean;
    canDeletePriorities?: boolean;
}

export default function SettingsPriorities({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    priorities = [],
    hasPrioritiesAccess = false,
    canCreatePriorities = false,
    canUpdatePriorities = false,
    canDeletePriorities = false,
}: SettingsPrioritiesProps) {
    // Other admins' changes to this project's settings arrive live.
    useSettingsLive(selectedProjectId);

    return (
        <SettingsLayout tabId="priorities" projects={projects}>
            <WorkspaceSettingsPrioritiesTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                priorities={priorities}
                hasPrioritiesAccess={hasPrioritiesAccess}
                canCreatePriorities={canCreatePriorities}
                canUpdatePriorities={canUpdatePriorities}
                canDeletePriorities={canDeletePriorities}
            />
        </SettingsLayout>
    );
}
