import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { inSettingsPage } from '@/tests/settingsPanels';
import DangerZonePanel from './DangerZonePanel';

describe('DangerZonePanel', () => {
    test('starts folded inside a settings page, so the destructive action is out of the way', () => {
        render(
            inSettingsPage(
                <DangerZonePanel
                    projectName="Orbit"
                    onDeleteRequest={vi.fn()}
                />,
                'members',
            ),
        );

        const header = screen.getByRole('button', { name: /Danger zone/ });
        expect(header).toHaveAttribute('aria-expanded', 'false');
        expect(
            screen.queryByRole('button', { name: 'Delete project' }),
        ).not.toBeInTheDocument();
    });

    test('unfolds on request and asks to delete', async () => {
        const onDeleteRequest = vi.fn();
        render(
            inSettingsPage(
                <DangerZonePanel
                    projectName="Orbit"
                    onDeleteRequest={onDeleteRequest}
                />,
                'members',
            ),
        );

        fireEvent.click(screen.getByRole('button', { name: /Danger zone/ }));
        fireEvent.click(
            await screen.findByRole('button', { name: 'Delete project' }),
        );

        expect(onDeleteRequest).toHaveBeenCalledTimes(1);
    });

    test('names the project in its row', () => {
        render(
            <DangerZonePanel projectName="Orbit" onDeleteRequest={vi.fn()} />,
        );

        expect(screen.getByText('Delete "Orbit"')).toBeInTheDocument();
    });
});
