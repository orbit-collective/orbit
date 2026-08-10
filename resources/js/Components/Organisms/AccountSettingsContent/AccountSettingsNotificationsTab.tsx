import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import AccountSettingsNotificationTypeRow from '@/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationTypeRow';
import { icons } from 'lucide-react';
import { useState } from 'react';

interface NotificationTypeState {
    id: string;
    icon: keyof typeof icons;
    title: string;
    description: string;
    inApp: boolean;
    email: boolean;
}

const initialNotificationTypes: NotificationTypeState[] = [
    {
        id: 'assigned-issues',
        icon: 'UserCheck',
        title: 'Assigned issues',
        description: 'When an issue is assigned or unassigned to you.',
        inApp: true,
        email: false,
    },
    {
        id: 'issue-updates',
        icon: 'RefreshCw',
        title: 'Issue updates',
        description:
            "When an issue you're involved in changes status, priority, or details.",
        inApp: true,
        email: false,
    },
    {
        id: 'comments',
        icon: 'MessageSquare',
        title: 'Comments',
        description: 'When someone comments on an issue assigned to you.',
        inApp: true,
        email: false,
    },
    {
        id: 'project-digest',
        icon: 'Layers',
        title: 'Project digest',
        description: 'Periodic summary of activity across your projects.',
        inApp: true,
        email: false,
    },
];

export default function AccountSettingsNotificationsTab() {
    const [notificationTypes, setNotificationTypes] = useState(
        initialNotificationTypes,
    );

    const updateNotificationType = (
        id: string,
        channel: 'inApp' | 'email',
        checked: boolean,
    ) => {
        setNotificationTypes((current) =>
            current.map((type) =>
                type.id === id ? { ...type, [channel]: checked } : type,
            ),
        );
    };

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Notification types"
                description="Choose which activity notifies you, and where."
                icon="Bell"
            >
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted-color)]">
                        Type
                    </span>
                    <div className="flex items-center gap-2 sm:gap-6">
                        <span className="w-12 whitespace-nowrap text-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted-color)] sm:w-16">
                            In-app
                        </span>
                        <span className="w-12 whitespace-nowrap text-center text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted-color)] sm:w-16">
                            Email
                        </span>
                    </div>
                </div>
                {notificationTypes.map((type) => (
                    <AccountSettingsNotificationTypeRow
                        key={type.id}
                        icon={type.icon}
                        title={type.title}
                        description={type.description}
                        inAppChecked={type.inApp}
                        onInAppChange={(checked) =>
                            updateNotificationType(type.id, 'inApp', checked)
                        }
                        emailChecked={type.email}
                        onEmailChange={(checked) =>
                            updateNotificationType(type.id, 'email', checked)
                        }
                    />
                ))}
            </SettingsPanel>
        </div>
    );
}
