import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AlertProvider } from '@/context/AlertContext';
import { expectPanelsToFold, inSettingsPage } from '@/tests/settingsPanels';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { PermissionDefinition, WorkspaceRole } from '@/types/Roles';
import WorkspaceSettingsRolesTab from './WorkspaceSettingsRolesTab';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: {
            ...actual.router,
            get: vi.fn(),
            post: vi.fn(),
            patch: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        },
    };
});

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };

const roles: WorkspaceRole[] = [
    {
        id: 1,
        name: 'Owner',
        slug: 'owner',
        type: 'owner',
        isSystem: true,
        memberCount: 1,
        permissionIds: [1, 2],
    },
    {
        id: 4,
        name: 'QA Reviewer',
        slug: 'qa-reviewer',
        type: 'custom',
        isSystem: false,
        memberCount: 3,
        permissionIds: [1],
    },
];

const permissions: PermissionDefinition[] = [
    { id: 1, key: 'issues.view', group: 'Issues' },
    { id: 2, key: 'issues.create', group: 'Issues' },
];

const tab = (
    props: Partial<Parameters<typeof WorkspaceSettingsRolesTab>[0]> = {},
) => (
    <AlertProvider>
        <WorkspaceSettingsRolesTab
            memberProjects={[project]}
            selectedProjectId={1}
            roles={roles}
            permissions={permissions}
            canCreateRoles
            canUpdateRoles
            canDeleteRoles
            hasSettingsAccess
            {...props}
        />
    </AlertProvider>
);

describe('WorkspaceSettingsRolesTab', () => {
    test('lists the roles and shows the first one in detail once it has risen in', async () => {
        render(tab());

        expect(
            (await screen.findAllByText('QA Reviewer')).length,
        ).toBeGreaterThan(0);
        expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    });

    test('the stat cards show the counts', () => {
        render(tab());

        // The stat card title and the panel header both say "Custom roles".
        expect(screen.getAllByText('Custom roles').length).toBeGreaterThan(1);
        expect(
            screen.getByText('Permissions', { selector: 'span' }),
        ).toBeInTheDocument();
        expect(screen.getByText('Members governed')).toBeInTheDocument();
    });

    test('switching role swaps the detail', async () => {
        render(tab());

        fireEvent.click((await screen.findAllByText('QA Reviewer'))[0]);

        expect(
            (await screen.findAllByText('QA Reviewer')).length,
        ).toBeGreaterThan(0);
    });

    test('the no-access state is a panel too', () => {
        render(tab({ hasSettingsAccess: false }));

        expect(
            screen.getByText(/don't have access to this project's settings/),
        ).toBeInTheDocument();
    });
});

describe('WorkspaceSettingsRolesTab panels', () => {
    beforeEach(() => localStorage.clear());

    test('the roles panel folds and, folded, counts its roles', () => {
        render(inSettingsPage(tab(), 'roles-management'));

        expectPanelsToFold([/Custom roles/]);

        fireEvent.click(screen.getByRole('button', { name: /Custom roles/ }));
        expect(screen.getAllByTestId('collapsed-summary')[0]).toHaveTextContent(
            '2 roles',
        );
    });

    test('the read-only panel folds when the user cannot change roles', () => {
        render(
            inSettingsPage(
                tab({
                    canCreateRoles: false,
                    canUpdateRoles: false,
                    canDeleteRoles: false,
                }),
                'roles-management',
            ),
        );

        expectPanelsToFold([/Read-only access/]);
    });

    test('the no-access panel folds', () => {
        render(
            inSettingsPage(
                tab({ hasSettingsAccess: false }),
                'roles-management',
            ),
        );

        expectPanelsToFold([/Roles and permissions/]);
    });
});
