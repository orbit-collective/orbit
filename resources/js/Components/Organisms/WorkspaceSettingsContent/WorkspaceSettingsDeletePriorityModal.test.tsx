import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { priorities } from '@/stories/fixtures';
import { SettingsPriority } from '@/types/Priorities';
import WorkspaceSettingsDeletePriorityModal from './WorkspaceSettingsDeletePriorityModal';

const scale: SettingsPriority[] = priorities.map((priority, index) => ({
    ...priority,
    issueCount: [3, 0, 1][index],
}));

const renderModal = (
    priority: SettingsPriority | null,
    overrides: Partial<
        Parameters<typeof WorkspaceSettingsDeletePriorityModal>[0]
    > = {},
) => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(
        <WorkspaceSettingsDeletePriorityModal
            isOpen
            onClose={onClose}
            priority={priority}
            otherPriorities={scale.filter((other) => other.id !== priority?.id)}
            onConfirm={onConfirm}
            {...overrides}
        />,
    );

    return { onConfirm, onClose };
};

describe('WorkspaceSettingsDeletePriorityModal', () => {
    test('renders nothing without a priority', () => {
        renderModal(null);

        expect(screen.queryByText('Delete priority')).not.toBeInTheDocument();
    });

    test('names the priority being removed', () => {
        renderModal(scale[0]);

        expect(screen.getAllByText('High').length).toBeGreaterThan(0);
        expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
    });

    test('offers the other priorities and No priority to move its issues to', () => {
        renderModal(scale[0]);

        expect(screen.getByText('Move its 3 issues to')).toBeInTheDocument();
        expect(
            screen.getAllByRole('option').map((option) => option.textContent),
        ).toEqual(['Medium', 'Low', 'No priority']);
    });

    test('uses the singular for a single issue', () => {
        renderModal(scale[2]);

        expect(screen.getByText('Move its 1 issue to')).toBeInTheDocument();
    });

    test('leaves the issues without a priority by default', async () => {
        const user = userEvent.setup();
        const { onConfirm, onClose } = renderModal(scale[0]);

        await user.click(
            screen.getByRole('button', { name: 'Delete priority' }),
        );

        expect(onConfirm).toHaveBeenCalledWith(null);
        expect(onClose).toHaveBeenCalled();
    });

    test('moves the issues to the chosen priority', async () => {
        const user = userEvent.setup();
        const { onConfirm } = renderModal(scale[0]);

        await user.selectOptions(screen.getByRole('combobox'), 'Low');
        await user.click(
            screen.getByRole('button', { name: 'Delete priority' }),
        );

        expect(onConfirm).toHaveBeenCalledWith(3);
    });

    test('skips the choice when no issue uses the priority', () => {
        renderModal(scale[1]);

        expect(
            screen.getByText('No issues use this priority.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    test('says which priority becomes the default when the default is deleted', async () => {
        const user = userEvent.setup();
        renderModal(scale[1], { otherPriorities: [scale[0], scale[2]] });

        expect(
            screen.getByText(/This is the default for new issues/),
        ).toBeInTheDocument();
        expect(
            screen.getByText('High', { selector: 'span.font-medium' }),
        ).toBeInTheDocument();

        // With issues the chosen replacement is the one that takes over.
        await user.click(screen.getByRole('button', { name: 'Cancel' }));
    });

    test('cancel closes without confirming', async () => {
        const user = userEvent.setup();
        const { onConfirm, onClose } = renderModal(scale[0]);

        await user.click(screen.getByRole('button', { name: 'Cancel' }));

        expect(onClose).toHaveBeenCalled();
        expect(onConfirm).not.toHaveBeenCalled();
    });
});
