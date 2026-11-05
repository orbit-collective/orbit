import { render } from '@testing-library/react';
import { describe, test, vi } from 'vitest';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import InviteByEmailPanel from './InviteByEmailPanel';

const props = {
    emailEnabled: true,
    canInvite: true,
    canAssignRoles: false,
    assignableRoles: [],
    email: '',
    role: 'member' as const,
    roleIds: [],
    error: null,
    isInviting: false,
    onEmailChange: vi.fn(),
    onRoleChange: vi.fn(),
    onToggleRoleId: vi.fn(),
    onSubmit: vi.fn(),
};

describe('InviteByEmailPanel', () => {
    test('folds inside a settings page', () => {
        render(inSettingsPage(<InviteByEmailPanel {...props} />, 'members'));

        expectPanelsToFold([/Invite by email/]);
    });

    test('its unavailable and no-permission variants fold too', () => {
        const { unmount } = render(
            inSettingsPage(
                <InviteByEmailPanel {...props} emailEnabled={false} />,
                'members',
            ),
        );
        expectPanelsToFold([/Invite by email/]);
        unmount();

        render(
            inSettingsPage(
                <InviteByEmailPanel {...props} canInvite={false} />,
                'members',
            ),
        );
        expectPanelsToFold([/Invite by email/]);
    });
});
