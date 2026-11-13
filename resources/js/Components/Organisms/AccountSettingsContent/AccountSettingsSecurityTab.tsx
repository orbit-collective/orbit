import { router, usePage } from '@inertiajs/react';
import { useLaravelReactI18n } from 'laravel-react-i18n';
import { useState } from 'react';
import RowReveal from '@/Components/Atoms/RowReveal/RowReveal';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsDeleteAccountModal from '@/Components/Organisms/AccountSettingsContent/AccountSettingsDeleteAccountModal';
import AccountSettingsPasswordForm from '@/Components/Organisms/AccountSettingsContent/AccountSettingsPasswordForm';
import AccountSettingsSessionsList from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSessionsList';
import AccountSettingsSessionTimeoutCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSessionTimeoutCard';
import { useAlert } from '@/context/AlertContext';
import { PageProps } from '@/types';
import { Session } from '@/types/Users';

const sessionTimeoutOptions = [
    { id: '1-hour', icon: 'Zap' as const, value: 60 },
    { id: '8-hours', icon: 'Clock3' as const, value: 480 },
    { id: '24-hours', icon: 'CalendarClock' as const, value: 1440 },
    { id: '7-days', icon: 'TimerReset' as const, value: 10080 },
];

interface AccountSettingsSecurityTabProps {
    sessions?: Session[];
}

export default function AccountSettingsSecurityTab({
    sessions = [],
}: AccountSettingsSecurityTabProps) {
    const { t, tChoice } = useLaravelReactI18n();
    const { addAlert } = useAlert();
    const { props } = usePage<PageProps>();
    const currentLifetime = props.auth?.user?.session_lifetime ?? 480;
    const [pendingLifetime, setPendingLifetime] = useState<number | null>(null);
    // const [resetCooldown, setResetCooldown] = useState(0);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    const selectSessionTimeout = (lifetime: number) => {
        if (lifetime === currentLifetime) {
            return;
        }

        setPendingLifetime(lifetime);
        router.post(
            route('account.session-lifetime.update', lifetime),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    addAlert(
                        t('account_settings.security.expiry_updated'),
                        'success',
                    );
                },
                onError: () => {
                    addAlert(
                        t('account_settings.security.expiry_failed'),
                        'error',
                    );
                },
                onFinish: () => {
                    setPendingLifetime(null);
                },
            },
        );
    };

    // const sendResetLink = () => {
    //     if (resetCooldown > 0) {
    //         return;
    //     }
    //
    //     addAlert('Password reset link sent — check your inbox.', 'success');
    //     setResetCooldown(30);
    //
    //     const interval = setInterval(() => {
    //         setResetCooldown((prev) => {
    //             if (prev <= 1) {
    //                 clearInterval(interval);
    //                 return 0;
    //             }
    //             return prev - 1;
    //         });
    //     }, 1000);
    // };

    const githubUsername = props.auth?.user?.github_username;
    const hasPassword = props.auth?.user?.has_password ?? true;
    const [isUnlinking, setIsUnlinking] = useState(false);

    const unlinkGithub = () => {
        setIsUnlinking(true);
        router.delete(route('auth.github.unlink'), {
            preserveScroll: true,
            onSuccess: () =>
                addAlert(t('account_settings.security.unlinked'), 'success'),
            onError: () =>
                addAlert(t('account_settings.security.unlink_failed'), 'error'),
            onFinish: () => setIsUnlinking(false),
        });
    };

    return (
        <div className="space-y-5">
            <SettingsPanel
                id="accounts"
                collapsedSummary={
                    githubUsername
                        ? t('account_settings.security.github_summary', {
                              username: githubUsername,
                          })
                        : t('account_settings.security.not_linked')
                }
                title={t('account_settings.security.accounts_title')}
                description={t(
                    'account_settings.security.accounts_description',
                )}
                icon="Link2"
            >
                <SettingsPanelRow
                    title="GitHub"
                    description={
                        githubUsername
                            ? t('account_settings.security.github_linked', {
                                  username: githubUsername,
                              })
                            : t('account_settings.security.github_unlinked')
                    }
                    action={
                        githubUsername ? (
                            <button
                                type="button"
                                onClick={unlinkGithub}
                                disabled={isUnlinking || !hasPassword}
                                title={
                                    hasPassword
                                        ? undefined
                                        : t(
                                              'account_settings.security.unlink_needs_password',
                                          )
                                }
                                className="rounded-md bg-(--error-color)/10 px-3 py-1.5 text-xs font-medium text-(--error-color) transition-colors hover:bg-(--error-color)/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isUnlinking
                                    ? t('account_settings.security.unlinking')
                                    : t('account_settings.security.unlink')}
                            </button>
                        ) : (
                            <a
                                href={route('auth.github.redirect')}
                                className="rounded-md bg-(--bg-color) px-3 py-1.5 text-xs font-medium text-(--text-color) transition-colors hover:bg-(--bg-light-color)"
                            >
                                {t('account_settings.security.link_github')}
                            </a>
                        )
                    }
                />
            </SettingsPanel>

            <SettingsPanel
                id="password"
                title={t('account_settings.security.password_title')}
                description={
                    hasPassword
                        ? t('account_settings.security.password_description')
                        : t(
                              'account_settings.security.password_description_set',
                          )
                }
                icon="KeyRound"
            >
                <AccountSettingsPasswordForm />
                {/*<SettingsPanelRow*/}
                {/*    title="Reset via email"*/}
                {/*    description="Send a password reset link if you've forgotten your current password."*/}
                {/*    action={*/}
                {/*        <Button*/}
                {/*            type="button"*/}
                {/*            isBox*/}
                {/*            onClick={sendResetLink}*/}
                {/*            isDisabled={resetCooldown > 0}*/}
                {/*            className="px-3 py-1.5 text-xs"*/}
                {/*        >*/}
                {/*            {resetCooldown > 0*/}
                {/*                ? `Resend in ${resetCooldown}s`*/}
                {/*                : 'Send reset link'}*/}
                {/*        </Button>*/}
                {/*    }*/}
                {/*/>*/}
            </SettingsPanel>

            <SettingsPanel
                id="sessions"
                collapsedSummary={tChoice(
                    'account_settings.security.sessions_count',
                    sessions.length,
                )}
                title={t('account_settings.security.sessions_title')}
                description={t(
                    'account_settings.security.sessions_description',
                )}
                icon="ShieldCheck"
            >
                <AccountSettingsSessionsList sessions={sessions} />
            </SettingsPanel>

            <SettingsPanel
                id="expiry"
                title={t('account_settings.security.expiry_title')}
                description={t('account_settings.security.expiry_description')}
                icon="Clock3"
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    {sessionTimeoutOptions.map((option, index) => (
                        <RowReveal key={option.id} index={index} fill>
                            <AccountSettingsSessionTimeoutCard
                                groupId="session-expiry"
                                label={t(
                                    `account_settings.security.timeout.${option.id}.label`,
                                )}
                                icon={option.icon}
                                description={t(
                                    `account_settings.security.timeout.${option.id}.description`,
                                )}
                                selected={
                                    (pendingLifetime ?? currentLifetime) ===
                                    option.value
                                }
                                isDisabled={pendingLifetime !== null}
                                onSelect={() =>
                                    selectSessionTimeout(option.value)
                                }
                            />
                        </RowReveal>
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                id="delete-account"
                defaultCollapsed
                title={t('account_settings.delete_account.title')}
                description={t('account_settings.security.delete_description')}
                icon="Trash"
            >
                <SettingsPanelRow
                    title={t('account_settings.security.delete_row_title')}
                    description={t(
                        'account_settings.security.delete_row_description',
                    )}
                    action={
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="rounded-md bg-(--error-color)/10 px-3 py-1.5 text-xs font-medium text-(--error-color) transition-colors hover:bg-(--error-color)/20"
                        >
                            {t('account_settings.delete_account.title')}
                        </button>
                    }
                />
            </SettingsPanel>

            <AccountSettingsDeleteAccountModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
            />
        </div>
    );
}
