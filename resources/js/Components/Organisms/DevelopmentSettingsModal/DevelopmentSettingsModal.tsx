import { useLaravelReactI18n } from 'laravel-react-i18n';
import { ReactNode, useId, useRef } from 'react';
import Modal from '@/Components/Atoms/Modal/Modal';
import SegmentedControl from '@/Components/Atoms/SegmentedControl/SegmentedControl';
import ToggleSwitch from '@/Components/Atoms/ToggleSwitch/ToggleSwitch';
import ModalHeader from '@/Components/Molecules/ModalHeader/ModalHeader';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { cn } from '@/utils/cn';
import {
    ACTIVITY_WEEK_CHOICES,
    COMMIT_CHOICES,
    DevelopmentRange,
    DevelopmentSection,
    DevelopmentSettings,
    PULL_REQUEST_LIMITS,
    RANGES,
    SECTIONS,
} from '@/utils/developmentSettings';
import { FOCUS_RING } from '@/utils/focusRing';

interface DevelopmentSettingsModalProps {
    settings: DevelopmentSettings;
    onChange: (changes: Partial<DevelopmentSettings>) => void;
    onReset: () => void;
    onClose: () => void;
}

function Group({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <section className="space-y-2">
            <h3 className="m-0 text-xs font-semibold tracking-wider text-(--text-gray-color) uppercase">
                {title}
            </h3>
            {hint && (
                <p className="m-0 text-xs text-(--text-muted-color)">{hint}</p>
            )}
            {children}
        </section>
    );
}

/**
 * How the Development view looks and what it reads, chosen per person and
 * remembered in this browser. Every change applies at once (there is nothing
 * to confirm); a hidden section is not drawn and not requested, which is also
 * the way to make the view lighter on a big repository.
 */
export default function DevelopmentSettingsModal({
    settings,
    onChange,
    onReset,
    onClose,
}: DevelopmentSettingsModalProps) {
    const { t } = useLaravelReactI18n();
    const dialog = useRef<HTMLDivElement>(null);
    const hintId = useId();

    useDialogFocus(dialog);

    return (
        <Modal isOpen onClose={onClose} size="sm">
            <div
                ref={dialog}
                role="dialog"
                aria-modal="true"
                aria-label={t('development_settings_modal.title')}
                className="flex min-h-0 flex-col"
            >
                <ModalHeader
                    title={t('development_settings_modal.title')}
                    onClose={onClose}
                />
                <div className="space-y-6 overflow-y-auto p-6">
                    <Group
                        title={t('development_settings_modal.pull_requests')}
                        hint={t(
                            'development_settings_modal.pull_requests_hint',
                        )}
                    >
                        <SegmentedControl<DevelopmentRange>
                            label={t('development_settings_modal.range')}
                            value={settings.range}
                            onChange={(range) => onChange({ range })}
                            options={RANGES.map((range) => ({
                                value: range,
                                label: t(
                                    `development_settings_modal.range_short.${range}`,
                                ),
                            }))}
                        />
                        <p
                            id={hintId}
                            className="m-0 pt-1 text-xs text-(--text-muted-color)"
                        >
                            {t(
                                `development_settings_modal.ranges.${settings.range}`,
                            )}
                        </p>
                        <SegmentedControl<number>
                            label={t('development_settings_modal.limit')}
                            value={settings.pullRequestLimit}
                            onChange={(pullRequestLimit) =>
                                onChange({ pullRequestLimit })
                            }
                            options={PULL_REQUEST_LIMITS.map((limit) => ({
                                value: limit,
                                label: String(limit),
                            }))}
                        />
                        <p className="m-0 pt-1 text-xs text-(--text-muted-color)">
                            {t('development_settings_modal.limit_hint')}
                        </p>
                    </Group>

                    <Group title={t('development_settings_modal.lists')}>
                        <div className="space-y-2">
                            <span className="block text-xs text-(--text-gray-color)">
                                {t('development_settings_modal.activity_weeks')}
                            </span>
                            <SegmentedControl<number>
                                label={t(
                                    'development_settings_modal.activity_weeks',
                                )}
                                value={settings.activityWeeks}
                                onChange={(activityWeeks) =>
                                    onChange({ activityWeeks })
                                }
                                options={ACTIVITY_WEEK_CHOICES.map((weeks) => ({
                                    value: weeks,
                                    label: String(weeks),
                                }))}
                            />
                            <span className="block pt-1 text-xs text-(--text-gray-color)">
                                {t('development_settings_modal.commits_shown')}
                            </span>
                            <SegmentedControl<number>
                                label={t(
                                    'development_settings_modal.commits_shown',
                                )}
                                value={settings.commitsShown}
                                onChange={(commitsShown) =>
                                    onChange({ commitsShown })
                                }
                                options={COMMIT_CHOICES.map((count) => ({
                                    value: count,
                                    label: String(count),
                                }))}
                            />
                        </div>
                    </Group>

                    <Group
                        title={t('development_settings_modal.sections')}
                        hint={t('development_settings_modal.sections_hint')}
                    >
                        <ul className="m-0 flex list-none flex-col gap-1 p-0">
                            {SECTIONS.map((section: DevelopmentSection) => (
                                <li
                                    key={section}
                                    className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5"
                                >
                                    <span className="text-sm text-(--text-color)">
                                        {t(
                                            `development_settings_modal.section.${section}`,
                                        )}
                                    </span>
                                    <ToggleSwitch
                                        label={t(
                                            `development_settings_modal.section.${section}`,
                                        )}
                                        checked={settings.sections[section]}
                                        onChange={(checked) =>
                                            onChange({
                                                sections: {
                                                    ...settings.sections,
                                                    [section]: checked,
                                                },
                                            })
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    </Group>
                </div>
                <footer className="flex items-center justify-between gap-3 border-t border-(--bg-light-color) px-6 py-4">
                    <button
                        type="button"
                        onClick={onReset}
                        className={cn(
                            'cursor-pointer rounded-sm border-none bg-transparent text-sm text-(--text-gray-color) transition-colors hover:text-(--text-color)',
                            FOCUS_RING,
                        )}
                    >
                        {t('development_settings_modal.reset')}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            'cursor-pointer rounded-xs bg-(--accent-color) px-5 py-2 text-sm font-medium text-(--text-color) transition-colors hover:bg-(--accent-light-color)',
                            FOCUS_RING,
                        )}
                    >
                        {t('development_settings_modal.done')}
                    </button>
                </footer>
            </div>
        </Modal>
    );
}
