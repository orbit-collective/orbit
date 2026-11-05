import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { inSettingsPage } from '@/tests/settingsPanels';
import PendingInvitationsPanel from './PendingInvitationsPanel';

describe('PendingInvitationsPanel', () => {
    test('says so when there are none', () => {
        render(
            <PendingInvitationsPanel
                invitations={[]}
                assignableRoles={[]}
                onRevoke={vi.fn()}
            />,
        );

        expect(screen.getByText('No pending invitations')).toBeInTheDocument();
    });

    test('folded, it still shows how many are pending', () => {
        render(
            inSettingsPage(
                <PendingInvitationsPanel
                    invitations={[]}
                    assignableRoles={[]}
                    onRevoke={vi.fn()}
                />,
                'members',
            ),
        );

        fireEvent.click(
            screen.getByRole('button', { name: /Pending invitations/ }),
        );

        expect(screen.getByTestId('collapsed-summary')).toHaveTextContent(
            '0 pending',
        );
    });
});
