import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import OwnershipPanel from './OwnershipPanel';

describe('OwnershipPanel', () => {
    test('asks to transfer ownership', () => {
        const onTransferRequest = vi.fn();
        render(<OwnershipPanel onTransferRequest={onTransferRequest} />);

        fireEvent.click(
            screen.getByRole('button', { name: 'Transfer ownership' }),
        );

        expect(onTransferRequest).toHaveBeenCalledTimes(1);
    });

    test('folds inside a settings page', () => {
        render(
            inSettingsPage(
                <OwnershipPanel onTransferRequest={vi.fn()} />,
                'members',
            ),
        );

        expectPanelsToFold([/^Ownership/]);
    });
});
