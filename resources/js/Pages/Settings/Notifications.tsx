import AccountSettingsNotificationsTab from '@/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationsTab';
import SettingsLayout from '@/Components/Organisms/SettingsLayout/SettingsLayout';
import {
    NotificationRetention,
    NotificationSettings,
} from '@/types/Notification';
import { Project } from '@/types/Projects';

interface SettingsNotificationsProps {
    projects?: Project[];
    notificationSettings?: NotificationSettings;
    notificationRetention?: NotificationRetention;
}

export default function SettingsNotifications({
    projects = [],
    notificationSettings,
    notificationRetention,
}: SettingsNotificationsProps) {
    return (
        <SettingsLayout tabId="notifications" projects={projects}>
            <AccountSettingsNotificationsTab
                notificationSettings={notificationSettings}
                notificationRetention={notificationRetention}
            />
        </SettingsLayout>
    );
}
