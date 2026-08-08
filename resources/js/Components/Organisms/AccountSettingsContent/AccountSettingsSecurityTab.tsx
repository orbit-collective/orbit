import Button from '@/Components/Atoms/Button/Button';
import SettingsPanel from '@/Components/Molecules/SettingsPanel/SettingsPanel';
import SettingsPanelRow from '@/Components/Molecules/SettingsPanelRow/SettingsPanelRow';
import AccountSettingsDeleteAccountModal from '@/Components/Organisms/AccountSettingsContent/AccountSettingsDeleteAccountModal';
import AccountSettingsPasswordForm from '@/Components/Organisms/AccountSettingsContent/AccountSettingsPasswordForm';
import AccountSettingsSessionTimeoutCard from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSessionTimeoutCard';
import AccountSettingsSessionsList from '@/Components/Organisms/AccountSettingsContent/AccountSettingsSessionsList';
import { useAlert } from '@/context/AlertContext';
import { useState } from 'react';

const sessionTimeoutOptions = [
    {
        id: '1-hour',
        label: '1 hour',
        icon: 'Zap' as const,
        description: 'Most secure. Re-authenticate frequently.',
    },
    {
        id: '8-hours',
        label: '8 hours',
        icon: 'Clock3' as const,
        description: 'Balanced for a typical workday.',
    },
    {
        id: '24-hours',
        label: '24 hours',
        icon: 'CalendarClock' as const,
        description: 'Stay signed in for a full day.',
    },
    {
        id: '7-days',
        label: '7 days',
        icon: 'TimerReset' as const,
        description: 'Most convenient. Sign in less often.',
    },
];

export default function AccountSettingsSecurityTab() {
    const { addAlert } = useAlert();
    const [sessionTimeout, setSessionTimeout] = useState('8-hours');
    const [resetCooldown, setResetCooldown] = useState(0);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
                <AccountSettingsSessionsList />
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
                            selected={sessionTimeout === option.id}
                            onSelect={() => setSessionTimeout(option.id)}
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
