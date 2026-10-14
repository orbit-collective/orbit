import { router } from '@inertiajs/react';
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

const FREQUENCY_OPTIONS: { value: RetentionFrequency; label: string }[] = [
    { value: 'daily', label: 'Every day' },
    { value: 'weekly', label: 'Every week' },
    { value: 'monthly', label: 'Every month' },
];

const AGE_DAYS = [7, 14, 30, 60, 90, 180, 365];

const ageLabel = (days: number): string => `${days} days`;

const AGE_OPTIONS = AGE_DAYS.map((days) => ({
    value: String(days),
    label: ageLabel(days),
}));

const AGE_OPTIONS_WITH_OFF = [
    { value: OFF, label: "Don't delete" },
    ...AGE_OPTIONS,
];

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
    const { addAlert } = useAlert();
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
                addAlert('Clean-up schedule saved.', 'success');
            },
            onError: (errors) => {
                setError(
                    Object.values(errors)[0] ??
                        'Failed to save the clean-up schedule.',
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
                    addAlert('Failed to delete the selected data.', 'error'),
                onFinish: () => {
                    setIsPurging(false);
                    setConfirming(null);
                },
            },
        );
    };

    const lastRun = retention?.last_run_at
        ? `Last ran ${formatTimeAgo(retention.last_run_at)} ago.`
        : 'Has not run yet.';

    return (
        <>
            <SettingsPanel
                title="Automatic clean-up"
                description="Keep your inbox and history tidy by deleting old items on a schedule."
                icon="CalendarClock"
            >
                <SettingsPanelRow
                    title="Run clean-up automatically"
                    description={draft.enabled ? lastRun : undefined}
                    action={
                        <ToggleSwitch
                            label="Run clean-up automatically"
                            checked={draft.enabled}
                            onChange={(enabled) => update({ enabled })}
                        />
                    }
                />
                <SettingsPanelRow
                    title="How often"
                    description="The clean-up runs at most once per period."
                    action={
                        <InlineSelectDropdown
                            label="Frequency"
                            placeholder="Frequency"
                            subtle
                            options={FREQUENCY_OPTIONS}
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
                    title="Delete notifications older than"
                    action={
                        <InlineSelectDropdown
                            label="Notification age"
                            placeholder="Don't delete"
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
                    title="Keep unread notifications"
                    description="Only notifications you have already read are deleted."
                    action={
                        <ToggleSwitch
                            label="Keep unread notifications"
                            checked={draft.notifications_only_read}
                            onChange={(notifications_only_read) =>
                                update({ notifications_only_read })
                            }
                        />
                    }
                />
                <SettingsPanelRow
                    title="Delete activity history older than"
                    description="Removes your own entries from the activity log."
                    action={
                        <InlineSelectDropdown
                            label="Activity age"
                            placeholder="Don't delete"
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
                        className="text-sm text-[var(--error-color)]"
                    >
                        {error}
                    </p>
                    <Button
                        type="button"
                        onClick={save}
                        isDisabled={!isDirty || isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save schedule'}
                    </Button>
                </div>
            </SettingsPanel>

            <SettingsPanel
                title="Clean up now"
                description="Delete old items right away, independent of the schedule."
                icon="Trash"
            >
                {(
                    [
                        {
                            target: 'notifications',
                            title: 'Delete old notifications',
                            description: draft.notifications_only_read
                                ? 'Unread notifications are kept.'
                                : 'Unread notifications are deleted too.',
                        },
                        {
                            target: 'activity',
                            title: 'Delete old activity history',
                            description:
                                'Removes your own activity log entries.',
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
                                    label="Older than"
                                    placeholder="Older than"
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
                                            Confirm
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() => setConfirming(null)}
                                            className="text-xs font-medium text-[var(--text-gray-color)] hover:underline"
                                        >
                                            Cancel
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
                                        Delete
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
