import AccountSettingsNotificationsTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import { NotificationSettings } from '@/types/Notification';
import { Project } from '@/types/Projects';

interface SettingsNotificationsProps {
    projects?: Project[];
    notificationSettings?: NotificationSettings;
}

export default function SettingsNotifications({
    projects = [],
    notificationSettings,
}: SettingsNotificationsProps) {
    return (
        <SettingsLayout tabId="notifications" projects={projects}>
            <AccountSettingsNotificationsTab
                notificationSettings={notificationSettings}
            />
        </SettingsLayout>
    );
}
