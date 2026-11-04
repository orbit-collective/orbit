import DeveloperPortalTab from '@/Components/Organisms/DeveloperPortal/DeveloperPortalTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import {
    Paginated,
    PortalContainers,
    PortalErrorLog,
    PortalProject,
    PortalTotals,
    PortalUser,
} from '@/types/DeveloperPortal';
import { Project } from '@/types/Projects';

interface SettingsDeveloperPortalProps {
    projects?: Project[];
    totals: PortalTotals;
    portalUsers: Paginated<PortalUser>;
    portalProjects: Paginated<PortalProject>;
    /** Deferred: absent until the server has read Docker. */
    containers?: PortalContainers;
    /** Deferred: absent until the server has read the log. */
    errorLog?: PortalErrorLog;
}

export default function SettingsDeveloperPortal({
    projects = [],
    totals,
    portalUsers,
    portalProjects,
    containers,
    errorLog,
}: SettingsDeveloperPortalProps) {
    return (
        <SettingsLayout tabId="dev-portal" projects={projects}>
            <DeveloperPortalTab
                totals={totals}
                portalUsers={portalUsers}
                portalProjects={portalProjects}
                containers={containers}
                errorLog={errorLog}
            />
        </SettingsLayout>
    );
}
