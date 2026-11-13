import { router } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import Button from '@/Components/Atoms/Button/Button';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import InlineSelectDropdown from '@/Components/Molecules/InlineSelectDropdown/InlineSelectDropdown';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import { useAlert } from '@/context/AlertContext';
import {
    NotificationRetention,
    RetentionFrequency,
} from '@/types/Notification';
import { formatTimeAgo } from '@/utils/time';

const OFF = 'off';

const FREQUENCY_OPTIONS: RetentionFrequency[] = ['daily', 'weekly', 'monthly'];

const AGE_DAYS = [7, 14, 30, 60, 90, 180, 365];

type PurgeTarget = 'notifications' | 'activity';

const initialDraft = (retention?: NotificationRetention) => ({
    enabled: retention?.enabled ?? false,
    frequency: retention?.frequency ?? 'weekly',
    notifications_older_than_days:
        retention?.notifications_older_than_days ?? null,
    notifications_only_read: retention?.notifications_only_read ?? true,
    activity_older_than_days: retention?.activity_older_than_days ?? null,
});

type Draft = ReturnType<typeof initialDraft>;

/**
 * Settings > Notifications: the automatic clean-up schedule (run by the
 * `notifications:prune` command) and one-off "delete older than N days"
 * actions for notifications and the user's own activity history.
 */
export default function AccountSettingsNotificationCleanup({
    retention,
}: {
    retention?: NotificationRetention;
}) {
    const { t } = useLaravelReactI18n();
    const { addAlert } = useAlert();

    const frequencyOptions = FREQUENCY_OPTIONS.map((value) => ({
        value,
        label: t(`account_settings.cleanup.frequency_options.${value}`),
    }));
    const AGE_OPTIONS = AGE_DAYS.map((days) => ({
        value: String(days),
        label: t('account_settings.cleanup.age_days', { days }),
    }));
    const AGE_OPTIONS_WITH_OFF = [
        { value: OFF, label: t('account_settings.cleanup.dont_delete') },
        ...AGE_OPTIONS,
    ];

    const [saved, setSaved] = useState(() => initialDraft(retention));
    const [draft, setDraft] = useState(saved);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [purgeDays, setPurgeDays] = useState<Record<PurgeTarget, number>>({
        notifications: 30,
        activity: 90,
    });
    const [confirming, setConfirming] = useState<PurgeTarget | null>(null);
    const [isPurging, setIsPurging] = useState(false);

    const isDirty = JSON.stringify(draft) !== JSON.stringify(saved);

    const update = (changes: Partial<Draft>) => {
        setDraft((current) => ({ ...current, ...changes }));
        setError(null);
    };

    const toDays = (value: string | null) =>
        value && value !== OFF ? Number(value) : null;

    const save = () => {
        setIsSaving(true);
        router.post(route('account.notification-retention.update'), draft, {
            preserveScroll: true,
            onSuccess: () => {
                setSaved(draft);
                addAlert(t('account_settings.cleanup.saved'), 'success');
            },
            onError: (errors) => {
                setError(
                    Object.values(errors)[0] ??
                        t('account_settings.cleanup.save_failed'),
                );
            },
            onFinish: () => setIsSaving(false),
        });
    };

    const purge = (target: PurgeTarget) => {
        setIsPurging(true);
        router.post(
            route('account.notification-retention.purge'),
            {
                target,
                days: purgeDays[target],
                only_read: draft.notifications_only_read,
            },
            {
                preserveScroll: true,
                onError: () =>
                    addAlert(
                        t('account_settings.cleanup.purge_failed'),
                        'error',
                    ),
                onFinish: () => {
                    setIsPurging(false);
                    setConfirming(null);
                },
            },
        );
    };

    const lastRun = retention?.last_run_at
        ? t('account_settings.cleanup.last_ran', {
              time: formatTimeAgo(retention.last_run_at, t),
          })
        : t('account_settings.cleanup.not_run');

    return (
        <>
            <SettingsPanel
                id="cleanup"
                collapsedSummary={
                    draft.enabled
                        ? t('account_settings.on')
                        : t('account_settings.off')
                }
                title={t('account_settings.cleanup.title')}
                description={t('account_settings.cleanup.description')}
                icon="CalendarClock"
            >
                <SettingsPanelRow
                    title={t('account_settings.cleanup.run_auto')}
                    description={draft.enabled ? lastRun : undefined}
                    action={
                        <ToggleSwitch
                            label={t('account_settings.cleanup.run_auto')}
                            checked={draft.enabled}
                            onChange={(enabled) => update({ enabled })}
                        />
                    }
                />
                <SettingsPanelRow
                    title={t('account_settings.cleanup.how_often')}
                    description={t(
                        'account_settings.cleanup.how_often_description',
                    )}
                    action={
                        <InlineSelectDropdown
                            label={t('account_settings.cleanup.frequency')}
                            placeholder={t(
                                'account_settings.cleanup.frequency',
                            )}
                            subtle
                            options={frequencyOptions}
                            value={draft.frequency}
                            onChange={(value) =>
                                value &&
                                update({
                                    frequency: value as RetentionFrequency,
                                })
                            }
                        />
                    }
                />
                <SettingsPanelRow
                    title={t('account_settings.cleanup.notifications_older')}
                    action={
                        <InlineSelectDropdown
                            label={t(
                                'account_settings.cleanup.notification_age',
                            )}
                            placeholder={t(
                                'account_settings.cleanup.dont_delete',
                            )}
                            subtle
                            options={AGE_OPTIONS_WITH_OFF}
                            value={
                                draft.notifications_older_than_days
                                    ? String(
                                          draft.notifications_older_than_days,
                                      )
                                    : OFF
                            }
                            onChange={(value) =>
                                update({
                                    notifications_older_than_days:
                                        toDays(value),
                                })
                            }
                        />
                    }
                />
                <SettingsPanelRow
                    title={t('account_settings.cleanup.keep_unread')}
                    description={t(
                        'account_settings.cleanup.keep_unread_description',
                    )}
                    action={
                        <ToggleSwitch
                            label={t('account_settings.cleanup.keep_unread')}
                            checked={draft.notifications_only_read}
                            onChange={(notifications_only_read) =>
                                update({ notifications_only_read })
                            }
                        />
                    }
                />
                <SettingsPanelRow
                    title={t('account_settings.cleanup.activity_older')}
                    description={t(
                        'account_settings.cleanup.activity_older_description',
                    )}
                    action={
                        <InlineSelectDropdown
                            label={t('account_settings.cleanup.activity_age')}
                            placeholder={t(
                                'account_settings.cleanup.dont_delete',
                            )}
                            subtle
                            options={AGE_OPTIONS_WITH_OFF}
                            value={
                                draft.activity_older_than_days
                                    ? String(draft.activity_older_than_days)
                                    : OFF
                            }
                            onChange={(value) =>
                                update({
                                    activity_older_than_days: toDays(value),
                                })
                            }
                        />
                    }
                />
                <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
                    <p
                        role={error ? 'alert' : undefined}
                        className="text-sm text-(--error-color)"
                    >
                        {error}
                    </p>
                    <Button
                        type="button"
                        onClick={save}
                        isDisabled={!isDirty || isSaving}
                    >
                        {isSaving
                            ? t('account_settings.cleanup.saving')
                            : t('account_settings.cleanup.save_schedule')}
                    </Button>
                </div>
            </SettingsPanel>

            <SettingsPanel
                id="cleanup-now"
                title={t('account_settings.cleanup.now_title')}
                description={t('account_settings.cleanup.now_description')}
                icon="Trash"
            >
                {(
                    [
                        {
                            target: 'notifications',
                            title: t(
                                'account_settings.cleanup.purge_notifications',
                            ),
                            description: draft.notifications_only_read
                                ? t('account_settings.cleanup.unread_kept')
                                : t('account_settings.cleanup.unread_deleted'),
                        },
                        {
                            target: 'activity',
                            title: t('account_settings.cleanup.purge_activity'),
                            description: t(
                                'account_settings.cleanup.purge_activity_description',
                            ),
                        },
                    ] as const
                ).map((row) => (
                    <SettingsPanelRow
                        key={row.target}
                        title={row.title}
                        description={row.description}
                        action={
                            <div className="flex items-center gap-2">
                                <InlineSelectDropdown
                                    label={t(
                                        'account_settings.cleanup.older_than',
                                    )}
                                    placeholder={t(
                                        'account_settings.cleanup.older_than',
                                    )}
                                    subtle
                                    options={AGE_OPTIONS}
                                    value={String(purgeDays[row.target])}
                                    onChange={(value) =>
                                        value &&
                                        setPurgeDays((current) => ({
                                            ...current,
                                            [row.target]: Number(value),
                                        }))
                                    }
                                />
                                {confirming === row.target ? (
                                    <>
                                        <Button
                                            type="button"
                                            variant="danger"
                                            onClick={() => purge(row.target)}
                                            isDisabled={isPurging}
                                        >
                                            {t('common.confirm')}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirming(null)}
                                            className="text-xs font-medium text-(--text-gray-color) hover:underline"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="danger"
                                        onClick={() =>
                                            setConfirming(row.target)
                                        }
                                        isDisabled={isPurging}
                                    >
                                        {t('common.delete')}
                                    </Button>
                                )}
                            </div>
                        }
                    />
                ))}
            </SettingsPanel>
        </>
    );
}
