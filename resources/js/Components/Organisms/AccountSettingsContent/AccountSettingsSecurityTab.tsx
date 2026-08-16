import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsDeleteAccountModal from '@/Components/Organisms/AccountSettingsContent/AccountSettingsDeleteAccountModal';
import AccountSettingsPasswordForm from '@/Components/Organisms/AccountSettingsContent/AccountSettingsPasswordForm';
import AccountSettingsSessionTimeoutCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSessionTimeoutCard';
import AccountSettingsSessionsList from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSessionsList';
import { useAlert } from '@/context/AlertContext';
import { PageProps } from '@/types';
import { Session } from '@/types/Users';
import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const sessionTimeoutOptions = [
    {
        id: '1-hour',
        label: '1 hour',
        icon: 'Zap' as const,
        description: 'Most secure. Re-authenticate frequently.',
        value: 60,
    },
    {
        id: '8-hours',
        label: '8 hours',
        icon: 'Clock3' as const,
        description: 'Balanced for a typical workday.',
        value: 480,
    },
    {
        id: '24-hours',
        label: '24 hours',
        icon: 'CalendarClock' as const,
        description: 'Stay signed in for a full day.',
        value: 1440,
    },
    {
        id: '7-days',
        label: '7 days',
        icon: 'TimerReset' as const,
        description: 'Most convenient. Sign in less often.',
        value: 10080,
    },
];

interface AccountSettingsSecurityTabProps {
    sessions?: Session[];
}

export default function AccountSettingsSecurityTab({
    sessions = [],
}: AccountSettingsSecurityTabProps) {
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
                    addAlert('Session expiry has been updated.', 'success');
                },
                onError: () => {
                    addAlert('Failed to update session expiry.', 'error');
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

    return (
        <div className="space-y-5">
            <SettingsPanel
                title="Password"
                description="Change your password or send yourself a reset link."
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
                title="Active sessions"
                description="Review and revoke devices currently signed in to your account."
                icon="ShieldCheck"
            >
                <AccountSettingsSessionsList sessions={sessions} />
            </SettingsPanel>

            <SettingsPanel
                title="Session expiry"
                description="Choose how long you stay signed in before re-authenticating."
                icon="Clock3"
            >
                <div className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-2">
                    {sessionTimeoutOptions.map((option) => (
                        <AccountSettingsSessionTimeoutCard
                            key={option.id}
                            label={option.label}
                            icon={option.icon}
                            description={option.description}
                            selected={
                                (pendingLifetime ?? currentLifetime) ===
                                option.value
                            }
                            isDisabled={pendingLifetime !== null}
                            onSelect={() => selectSessionTimeout(option.value)}
                        />
                    ))}
                </div>
            </SettingsPanel>

            <SettingsPanel
                title="Delete account"
                description="Permanently remove your Orbit account and associated data."
                icon="Trash2"
            >
                <SettingsPanelRow
                    title="Delete this account"
                    description="This action is permanent and cannot be undone."
                    action={
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="bg-[var(--error-color)]/10 hover:bg-[var(--error-color)]/20 rounded-md px-3 py-1.5 text-xs font-medium text-[var(--error-color)] transition-colors"
                        >
                            Delete account
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
