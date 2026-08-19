import { WorkspaceSettingsTabId } from '@/types/Settings';
import WorkspaceSettingsDocumentsTab from './WorkspaceSettingsDocumentsTab';
import WorkspaceSettingsLabelsTab from './WorkspaceSettingsLabelsTab';
import WorkspaceSettingsMembersTab from './WorkspaceSettingsMembersTab';
import WorkspaceSettingsPrioritiesTab from './WorkspaceSettingsPrioritiesTab';
import WorkspaceSettingsRolesTab from './WorkspaceSettingsRolesTab';
import WorkspaceSettingsStatusesTab from './WorkspaceSettingsStatusesTab';
import WorkspaceSettingsTemplatesTab from './WorkspaceSettingsTemplatesTab';

interface WorkspaceSettingsContentProps {
    tabId: WorkspaceSettingsTabId;
}

export default function WorkspaceSettingsContent({
    tabId,
}: WorkspaceSettingsContentProps) {
    if (tabId === 'labels') {
        return <WorkspaceSettingsLabelsTab />;
    }

    if (tabId === 'statuses') {
        return <WorkspaceSettingsStatusesTab />;
    }

    if (tabId === 'priorities') {
        return <WorkspaceSettingsPrioritiesTab />;
    }

    if (tabId === 'templates') {
        return <WorkspaceSettingsTemplatesTab />;
    }

    if (tabId === 'documents') {
        return <WorkspaceSettingsDocumentsTab />;
    }

    if (tabId === 'members') {
        return <WorkspaceSettingsMembersTab />;
    }

    return <WorkspaceSettingsRolesTab />;
}
