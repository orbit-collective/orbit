import AccountSettingsSecurityTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSecurityTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { Project } from '@/types/Projects';
import { Session } from '@/types/Users';

interface SettingsSecurityAccessProps {
    projects?: Project[];
    sessions?: Session[];
}

export default function SettingsSecurityAccess({
    projects = [],
    sessions = [],
}: SettingsSecurityAccessProps) {
    return (
        <SettingsLayout tabId="security-access" projects={projects}>
            <AccountSettingsSecurityTab sessions={sessions} />
        </SettingsLayout>
    );
}
