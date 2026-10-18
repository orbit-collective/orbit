import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsAutomationTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsAutomationTab';
import { AutomationOption, AutomationRule } from '@/types/Automation';
import { IssueType } from '@/types/IssueTypes';
import { ProjectPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsAutomationProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    automationRules?: AutomationRule[];
    triggerTypes?: AutomationOption[];
    actionTypes?: AutomationOption[];
    issueTypes?: IssueType[];
    priorities?: ProjectPriority[];
    hasAutomationAccess?: boolean;
    canUpdateAutomation?: boolean;
}

export default function SettingsAutomation({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    automationRules = [],
    triggerTypes = [],
    actionTypes = [],
    issueTypes = [],
    priorities = [],
    hasAutomationAccess = false,
    canUpdateAutomation = false,
}: SettingsAutomationProps) {
    return (
        <SettingsLayout tabId="automation" projects={projects} fullBleed>
            <WorkspaceSettingsAutomationTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                automationRules={automationRules}
                triggerTypes={triggerTypes}
                actionTypes={actionTypes}
                issueTypes={issueTypes}
                priorities={priorities}
                hasAutomationAccess={hasAutomationAccess}
                canUpdateAutomation={canUpdateAutomation}
            />
        </SettingsLayout>
    );
}
