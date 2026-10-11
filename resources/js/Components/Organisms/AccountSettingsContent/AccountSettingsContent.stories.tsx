import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, fn, within } from 'storybook/test';
import { Session } from '@/types/Users';
import AccountSettingsAvatarLibrary from './AccountSettingsAvatarLibrary';
import AccountSettingsDeleteAccountModal from './AccountSettingsDeleteAccountModal';
import AccountSettingsExportTab from './AccountSettingsExportTab';
import AccountSettingsNotificationsTab from './AccountSettingsNotificationsTab';
import AccountSettingsPasswordForm from './AccountSettingsPasswordForm';
import AccountSettingsPreferencesTab from './AccountSettingsPreferencesTab';
import AccountSettingsProfileTab from './AccountSettingsProfileTab';
import AccountSettingsSecurityTab from './AccountSettingsSecurityTab';
import AccountSettingsSessionsList from './AccountSettingsSessionsList';

const minutesAgo = (minutes: number) =>
    new Date(Date.now() - minutes * 60_000).toISOString();

const sessions: Session[] = [
    {
        id: 'current',
        ipAddress: '192.168.1.24',
        userAgent:
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        lastActiveAt: minutesAgo(1),
        isCurrent: true,
    },
    {
        id: 'phone',
        ipAddress: '84.23.110.8',
        userAgent:
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1',
        lastActiveAt: minutesAgo(180),
        isCurrent: false,
    },
    {
        id: 'laptop',
        ipAddress: null,
        userAgent: null,
        lastActiveAt: minutesAgo(60 * 24 * 3),
        isCurrent: false,
    },
];

const meta = {
    title: 'Organisms/AccountSettingsContent',
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-3xl">
                <Story />
            </div>
        ),
    ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Preferences: Story = {
    render: () => <AccountSettingsPreferencesTab />,
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByText('List'),
        ).toBeVisible();
    },
};

export const Profile: Story = {
    render: () => (
        <AccountSettingsProfileTab userName="Jane Cooper" userAvatar={null} />
    ),
    play: async ({ canvasElement }) => {
        await expect(
            await within(canvasElement).findByDisplayValue('Jane Cooper'),
        ).toBeVisible();
    },
};

export const ProfileValidationError: Story = {
    ...Profile,
    parameters: {
        inertia: { formErrors: { name: 'The name field is required.' } },
    },
};

export const Notifications: Story = {
    render: () => (
        <AccountSettingsNotificationsTab
            notificationSettings={{
                issue_assigned: { in_app: true, email: true },
            }}
        />
    ),
};

export const Security: Story = {
    render: () => <AccountSettingsSecurityTab sessions={sessions} />,
    parameters: { inertia: { url: '/settings/security-access' } },
};

export const SecurityWithoutSessions: Story = {
    render: () => <AccountSettingsSecurityTab />,
};

export const SessionsList: Story = {
    render: () => <AccountSettingsSessionsList sessions={sessions} />,
};

export const PasswordForm: Story = {
    render: () => <AccountSettingsPasswordForm />,
};

export const PasswordFormErrors: Story = {
    render: () => <AccountSettingsPasswordForm />,
    parameters: {
        inertia: {
            formErrors: {
                current_password: 'The current password is incorrect.',
            },
        },
    },
};

export const Export: Story = {
    render: () => <AccountSettingsExportTab />,
};

export const AvatarLibrary: Story = {
    render: function Render() {
        const [selected, setSelected] = useState<string | null>(null);
        return (
            <AccountSettingsAvatarLibrary
                avatarSrc={selected}
                onSelect={setSelected}
            />
        );
    },
};

/** The destructive confirmation only unlocks once the phrase is typed. */
export const DeleteAccountModal: Story = {
    render: () => <AccountSettingsDeleteAccountModal isOpen onClose={fn()} />,
};
