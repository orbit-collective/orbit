import { NotificationSettings } from '@/types/Notification';
import { AccountSettingsTabId } from '@/types/Settings';
import { Session } from '@/types/Users';
import AccountSettingsExportTab from './AccountSettingsExportTab';
import AccountSettingsNotificationsTab from './AccountSettingsNotificationsTab';
import AccountSettingsPreferencesTab from './AccountSettingsPreferencesTab';
import AccountSettingsProfileTab from './AccountSettingsProfileTab';
import AccountSettingsSecurityTab from './AccountSettingsSecurityTab';

interface AccountSettingsContentProps {
    tabId: AccountSettingsTabId;
    userName?: string;
    userAvatar?: string | null;
    sessions?: Session[];
    notificationSettings?: NotificationSettings;
}

export default function AccountSettingsContent({
    tabId,
    userName,
    userAvatar,
    sessions = [],
    notificationSettings,
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
        return (
            <AccountSettingsNotificationsTab
                notificationSettings={notificationSettings}
            />
        );
    }

    if (tabId === 'security-access') {
        return <AccountSettingsSecurityTab sessions={sessions} />;
    }

    return <AccountSettingsExportTab />;
}
