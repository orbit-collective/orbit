import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import type { icons } from 'lucide-react';
import { useState } from 'react';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import AccountSettingsBrowserNotifications from '@/Components/Organisms/AccountSettingsContent/AccountSettingsBrowserNotifications';
import AccountSettingsNotificationCleanup from '@/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationCleanup';
import AccountSettingsNotificationTypeRow from '@/Components/Organisms/AccountSettingsContent/AccountSettingsNotificationTypeRow';
import { useAlert } from '@/context/AlertContext';
import {
    NotificationRetention,
    NotificationSettings,
} from '@/types/Notification';

interface NotificationTypeState {
    id: string;
    icon: keyof typeof icons;
    inApp: boolean;
    email: boolean;
}

const defaultNotificationTypes: NotificationTypeState[] = [
    {
        id: 'issue_assigned',
        icon: 'UserCheck',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_commented',
        icon: 'MessageSquare',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_mentioned',
        icon: 'AtSign',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_status_changed',
        icon: 'CircleCheckBig',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_priority_changed',
        icon: 'Flag',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_labels_changed',
        icon: 'Tag',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_dates_changed',
        icon: 'CalendarClock',
        inApp: true,
        email: false,
    },
    {
        id: 'issue_updated',
        icon: 'Pencil',
        inApp: true,
        email: false,
    },
    {
        id: 'project_invited',
        icon: 'Users',
        inApp: true,
        email: false,
    },
    {
        id: 'integration_activity',
        icon: 'Plug',
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
    notificationRetention,
}: {
    notificationSettings?: NotificationSettings;
    notificationRetention?: NotificationRetention;
}) {
    const { t } = useLaravelReactI18n();
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
                        t('account_settings.notifications.updated'),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t('account_settings.notifications.update_failed'),
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
                id="types"
                collapsedSummary={t(
                    'account_settings.notifications.types_summary',
                    {
                        count: notificationTypes.length,
                    },
                )}
                title={t('account_settings.notifications.title')}
                description={t('account_settings.notifications.description')}
                icon="Bell"
            >
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
                    <span className="text-[10px] font-medium tracking-wide text-(--text-muted-color) uppercase">
                        {t('account_settings.notifications.column_type')}
                    </span>
                    <div className="flex items-center gap-2 sm:gap-6">
                        <span className="w-12 text-center text-[10px] font-medium tracking-wide whitespace-nowrap text-(--text-muted-color) uppercase sm:w-16">
                            {t('account_settings.notifications.column_in_app')}
                        </span>
                        <span className="w-12 text-center text-[10px] font-medium tracking-wide whitespace-nowrap text-(--text-muted-color) uppercase sm:w-16">
                            {t('account_settings.notifications.column_email')}
                        </span>
                    </div>
                </div>
                {notificationTypes.map((type, index) => (
                    <RowReveal key={type.id} index={index}>
                        <AccountSettingsNotificationTypeRow
                            icon={type.icon}
                            title={t(
                                `account_settings.notifications.types.${type.id}.title`,
                            )}
                            description={t(
                                `account_settings.notifications.types.${type.id}.description`,
                            )}
                            inAppChecked={type.inApp}
                            onInAppChange={(checked) =>
                                updateNotificationType(
                                    type.id,
                                    'inApp',
                                    checked,
                                )
                            }
                            inAppDisabled={pendingKey === `${type.id}:inApp`}
                            emailChecked={type.email}
                            onEmailChange={(checked) =>
                                updateNotificationType(
                                    type.id,
                                    'email',
                                    checked,
                                )
                            }
                            emailDisabled={pendingKey === `${type.id}:email`}
                        />
                    </RowReveal>
                ))}
            </SettingsPanel>

            <AccountSettingsBrowserNotifications />

            <AccountSettingsNotificationCleanup
                retention={notificationRetention}
            />
        </div>
    );
}
