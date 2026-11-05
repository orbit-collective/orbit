import {
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { WorkspaceRole } from '@/types/Roles';
import { ROLE_TYPE_THEME } from '@/utils/roleTheme';
import RoleListItem from './RoleListItem';

const role: WorkspaceRole = {
    id: 4,
    name: 'QA Reviewer',
    slug: 'qa',
    type: 'custom',
    isSystem: false,
    memberCount: 3,
    permissionIds: [1, 2],
};

const renderItem = (props = {}) =>
    render(
        <RoleListItem
            role={role}
            theme={ROLE_TYPE_THEME.custom}
            totalPermissions={4}
            selected={false}
            onClick={vi.fn()}
            {...props}
        />,
    );

describe('RoleListItem', () => {
    test('shows the role, its member count and the share of permissions it grants', async () => {
        renderItem();

        expect(screen.getByText('QA Reviewer')).toBeInTheDocument();
        await waitFor(() => expect(screen.getByText('50')).toBeInTheDocument());
        expect(screen.getByText(/members/)).toHaveTextContent('3 members');
        expect(screen.getByTestId('progress-arc')).toHaveAttribute(
            'data-progress',
            '50',
        );
    });

    test('says "member" for one and shows a lock for system roles', () => {
        renderItem({ role: { ...role, memberCount: 1, isSystem: true } });

        expect(screen.getByText(/member/)).toHaveTextContent('1 member');
    });

    test('a role without permissions to share shows zero', () => {
        renderItem({ totalPermissions: 0 });

        expect(screen.getByTestId('progress-arc')).toHaveAttribute(
            'data-progress',
            '0',
        );
    });

    test('only the selected role carries the gliding highlight and no clipping', () => {
        const { rerender } = renderItem();
        expect(
            screen.queryByTestId('selection-highlight'),
        ).not.toBeInTheDocument();

        rerender(
            <RoleListItem
                role={role}
                theme={ROLE_TYPE_THEME.custom}
                totalPermissions={4}
                selected
                onClick={vi.fn()}
            />,
        );

        const button = screen.getByRole('button');
        expect(
            within(button).getByTestId('selection-highlight'),
        ).toBeInTheDocument();
        expect(button.className).not.toContain('overflow-hidden');
    });

    test('reports a click', () => {
        const onClick = vi.fn();
        renderItem({ onClick });

        fireEvent.click(screen.getByRole('button'));

        expect(onClick).toHaveBeenCalledTimes(1);
    });
});
