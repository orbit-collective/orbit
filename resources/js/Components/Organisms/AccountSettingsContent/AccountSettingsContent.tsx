import { AccountSettingsTabId } from '@/types/Settings';
import AccountSettingsExportTab from './AccountSettingsExportTab';
import AccountSettingsIntegrationsTab from './AccountSettingsIntegrationsTab';
import AccountSettingsNotificationsTab from './AccountSettingsNotificationsTab';
import AccountSettingsPreferencesTab from './AccountSettingsPreferencesTab';
import AccountSettingsProfileTab from './AccountSettingsProfileTab';
import AccountSettingsSecurityTab from './AccountSettingsSecurityTab';

interface AccountSettingsContentProps {
    tabId: AccountSettingsTabId;
    userName?: string;
    userAvatar?: string | null;
}

export default function AccountSettingsContent({
    tabId,
    userName,
    userAvatar,
}: AccountSettingsContentProps) {
    if (tabId === 'preferences') {
        return <AccountSettingsPreferencesTab />;
    }

    if (tabId === 'profile') {
        return (
            <AccountSettingsProfileTab
                userName={userName}
                userAvatar={userAvatar}
            />
        );
    }

    if (tabId === 'notifications') {
        return <AccountSettingsNotificationsTab />;
    }

    if (tabId === 'security-access') {
        return <AccountSettingsSecurityTab />;
    }

    if (tabId === 'integrations') {
        return <AccountSettingsIntegrationsTab />;
    }

    return <AccountSettingsExportTab />;
}
