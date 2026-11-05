import { render, screen } from '@testing-library/react';
import { describe, test, vi } from 'vitest';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import JoinWithCodePanel from './JoinWithCodePanel';

describe('JoinWithCodePanel', () => {
    test('folds inside a settings page', () => {
        render(
            inSettingsPage(
                <JoinWithCodePanel
                    token=""
                    error={null}
                    isJoining={false}
                    onChange={vi.fn()}
                    onSubmit={vi.fn()}
                />,
                'members',
            ),
        );

        expectPanelsToFold([/Join with an invite code/]);
        screen.getByText('Invitation code');
    });
});
