import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import AccountSettingsNotificationTypeRow from '@/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationTypeRow';
import { useAlert } from '@/context/AlertContext';
import { NotificationSettings } from '@/types/Notification';
import { router } from '@inertiajs/react';
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

const defaultNotificationTypes: NotificationTypeState[] = [
    {
        id: 'issue_assigned',
        icon: 'UserCheck',
        title: 'Assigned issues',
        description: 'When an issue is assigned or unassigned to you.',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_commented',
        icon: 'MessageSquare',
        title: 'Comments',
        description: "When an issue you're involved in is commented on.",
        inApp: true,
        email: false,
    },
    {
        id: 'issue_mentioned',
        icon: 'AtSign',
        title: 'Mentions',
        description: 'When someone mentions you in a comment.',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_status_changed',
        icon: 'CircleCheckBig',
        title: 'Status changes',
        description: "When an issue you're involved in has its status updated.",
        inApp: true,
        email: false,
    },
    {
        id: 'project_invited',
        icon: 'Users',
        title: 'Project invitations',
        description: 'When you are invited to join a new project.',
        inApp: true,
        email: false,
    },
];

function mergeNotificationSettings(
    notificationSettings?: NotificationSettings,
): NotificationTypeState[] {
    if (!notificationSettings) {
        return defaultNotificationTypes;
    }

    return defaultNotificationTypes.map((type) => {
        const settings = notificationSettings[type.id];
        if (!settings) {
            return type;
        }

        return {
            ...type,
            inApp: settings.in_app,
            email: settings.email,
        };
    });
}

export default function AccountSettingsNotificationsTab({
    notificationSettings,
}: {
    notificationSettings?: NotificationSettings;
}) {
    const { addAlert } = useAlert();
    const [notificationTypes, setNotificationTypes] = useState(() =>
        mergeNotificationSettings(notificationSettings),
    );
    const [pendingKey, setPendingKey] = useState<string | null>(null);

    const updateNotificationType = (
        id: string,
        channel: 'inApp' | 'email',
        checked: boolean,
    ) => {
        const previousType = notificationTypes.find((type) => type.id === id);
        if (!previousType) {
            return;
        }

        const updatedType = { ...previousType, [channel]: checked };

        setPendingKey(`${id}:${channel}`);
        setNotificationTypes((current) =>
            current.map((type) => (type.id === id ? updatedType : type)),
        );

        router.post(
            route('account.notification-settings.update'),
            {
                settings: {
                    [id]: {
                        in_app: updatedType.inApp,
                        email: updatedType.email,
                    },
                },
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    addAlert(
                        'Notification settings updated successfully.',
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        'Failed to update notification settings.',
                        'error',
                    );
                    setNotificationTypes((current) =>
                        current.map((type) =>
                            type.id === id ? previousType : type,
                        ),
                    );
                },
                onFinish: () => {
                    setPendingKey(null);
                },
            },
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
                        inAppDisabled={pendingKey === `${type.id}:inApp`}
                        emailChecked={type.email}
                        onEmailChange={(checked) =>
                            updateNotificationType(type.id, 'email', checked)
                        }
                        emailDisabled={pendingKey === `${type.id}:email`}
                    />
                ))}
            </SettingsPanel>
        </div>
    );
}
