import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PermissionDefinition } from '@/types/Roles';
import PermissionGroupCard from './PermissionGroupCard';

const perm = (id: number, key: string): PermissionDefinition => ({
    id,
    key,
    group: 'projects',
});
const sections = [
    {
        section: 'General',
        permissions: [perm(1, 'projects.view'), perm(2, 'projects.update')],
    },
    { section: 'Members', permissions: [perm(3, 'projects.members.view')] },
];

const renderCard = (props = {}) =>
    render(
        <PermissionGroupCard
            label="Projects"
            icon="FolderKanban"
            sections={sections}
            permissionIds={[1, 2, 3]}
            enabledIds={[1]}
            canEdit
            forceExpanded={false}
            onToggle={vi.fn()}
            onSetAll={vi.fn()}
            {...props}
        />,
    );

describe('PermissionGroupCard', () => {
    test('shows how many permissions are on and fills the bar to that share', async () => {
        renderCard();

        expect(screen.getByText('1/3')).toBeInTheDocument();
        expect(screen.getByTestId('ratio-bar')).toHaveAttribute(
            'data-ratio',
            '33',
        );
    });

    test('a full group has a full bar', () => {
        renderCard({ enabledIds: [1, 2, 3] });

        expect(screen.getByTestId('ratio-bar')).toHaveAttribute(
            'data-ratio',
            '100',
        );
    });

    test('folds and unfolds its sections, keeping them mounted', async () => {
        renderCard();
        const body = screen.getByText('View project');
        expect(body).toBeVisible();

        fireEvent.click(screen.getByText('Projects'));
        await waitFor(() => expect(body).not.toBeVisible());

        fireEvent.click(screen.getByText('Projects'));
        await waitFor(() => expect(body).toBeVisible());
    });

    test('a search forces it open and hides the chevron', () => {
        renderCard({ forceExpanded: true });

        expect(screen.getByText('View project')).toBeVisible();
    });

    test('All and None set the whole group without folding it', async () => {
        const onSetAll = vi.fn();
        renderCard({ onSetAll });

        fireEvent.click(screen.getByText('All'));
        fireEvent.click(screen.getByText('None'));

        expect(onSetAll).toHaveBeenNthCalledWith(1, [1, 2, 3], true);
        expect(onSetAll).toHaveBeenNthCalledWith(2, [1, 2, 3], false);
        expect(screen.getByText('View project')).toBeVisible();
    });

    test('a read-only group has no All / None', () => {
        renderCard({ canEdit: false });

        expect(screen.queryByText('All')).not.toBeInTheDocument();
    });
});
