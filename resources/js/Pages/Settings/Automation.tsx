import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsAutomationTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsAutomationTab';
import { AutomationOption, AutomationRule } from '@/types/Automation';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsAutomationProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    automationRules?: AutomationRule[];
    triggerTypes?: AutomationOption[];
    actionTypes?: AutomationOption[];
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
                hasAutomationAccess={hasAutomationAccess}
                canUpdateAutomation={canUpdateAutomation}
            />
        </SettingsLayout>
    );
}
