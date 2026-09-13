import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import WorkspaceSettingsIssueTypesTab from '@/Components/Organisms/WorkspaceSettingsContent/WorkspaceSettingsIssueTypesTab';
import { IssueType } from '@/types/IssueTypes';
import { ProjectLabel } from '@/types/Labels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { Project } from '@/types/Projects';

interface SettingsIssueTypesProps {
    projects?: Project[];
    memberProjects?: MemberProjectSummary[];
    selectedProjectId?: number | null;
    issueTypes?: IssueType[];
    labels?: ProjectLabel[];
    hasIssueTypesAccess?: boolean;
    canCreateIssueTypes?: boolean;
    canUpdateIssueTypes?: boolean;
    canDeleteIssueTypes?: boolean;
    canUpdateWorkflow?: boolean;
}

export default function SettingsIssueTypes({
    projects = [],
    memberProjects = [],
    selectedProjectId = null,
    issueTypes = [],
    labels = [],
    hasIssueTypesAccess = false,
    canCreateIssueTypes = false,
    canUpdateIssueTypes = false,
    canDeleteIssueTypes = false,
    canUpdateWorkflow = false,
}: SettingsIssueTypesProps) {
    return (
        <SettingsLayout tabId="issue-types" projects={projects}>
            <WorkspaceSettingsIssueTypesTab
                memberProjects={memberProjects}
                selectedProjectId={selectedProjectId}
                issueTypes={issueTypes}
                labels={labels}
                hasIssueTypesAccess={hasIssueTypesAccess}
                canCreateIssueTypes={canCreateIssueTypes}
                canUpdateIssueTypes={canUpdateIssueTypes}
                canDeleteIssueTypes={canDeleteIssueTypes}
                canUpdateWorkflow={canUpdateWorkflow}
            />
        </SettingsLayout>
    );
}
