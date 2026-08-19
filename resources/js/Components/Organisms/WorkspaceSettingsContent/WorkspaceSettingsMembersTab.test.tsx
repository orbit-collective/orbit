import { AlertProvider } from '@/context/AlertContext';
import { MemberProjectSummary, ProjectMember } from '@/types/ProjectMembers';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsMembersTab from './WorkspaceSettingsMembersTab';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

const { mockRouterPost, mockRouterPatch, mockRouterDelete, mockRouterGet } =
    vi.hoisted(() => ({
        mockRouterPost: vi.fn(
            (
                _url: string,
                _data?: unknown,
                opts?: { onSuccess?: () => void; onFinish?: () => void },
            ) => {
                opts?.onSuccess?.();
                opts?.onFinish?.();
            },
        ),
        mockRouterPatch: vi.fn(),
        mockRouterDelete: vi.fn(),
        mockRouterGet: vi.fn(),
    }));

let mockEmailEnabled = true;

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({
            props: { flash: {}, emailEnabled: mockEmailEnabled },
        }),
        router: {
            ...actual.router,
            post: mockRouterPost,
            patch: mockRouterPatch,
            delete: mockRouterDelete,
            get: mockRouterGet,
        },
    };
});

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };

const admin: ProjectMember = {
    id: 1,
    name: 'Ada Admin',
    email: 'ada@example.com',
    avatar: null,
    role: 'admin',
    joinedAt: new Date().toISOString(),
};

const member: ProjectMember = {
    id: 2,
    name: 'Mark Member',
    email: 'mark@example.com',
    avatar: null,
    role: 'member',
    joinedAt: new Date().toISOString(),
};

const renderTab = (
    props: Partial<Parameters<typeof WorkspaceSettingsMembersTab>[0]> = {},
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsMembersTab
                memberProjects={[project]}
                selectedProjectId={project.id}
                viewerRole="admin"
                members={[admin, member]}
                pendingInvitations={[]}
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsMembersTab', () => {
    beforeEach(() => {
        mockEmailEnabled = true;
        vi.clearAllMocks();
    });

    test('shows an empty state when the user belongs to no project', () => {
        renderTab({ memberProjects: [], selectedProjectId: null, members: [] });

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('lists members with their roles', () => {
        renderTab();

        expect(screen.getByText('Ada Admin')).toBeInTheDocument();
        expect(screen.getByText('Mark Member')).toBeInTheDocument();
    });

    test('admins can invite a teammate by email', async () => {
        const user = userEvent.setup();
        renderTab();

        await user.type(
            screen.getByPlaceholderText('teammate@company.com'),
            'new@example.com',
        );
        await user.click(screen.getByText('Invite'));

        await waitFor(() => {
            expect(mockRouterPost).toHaveBeenCalledWith(
                '/projects/1/invitations',
                { email: 'new@example.com', role: 'member' },
                expect.any(Object),
            );
        });
    });

    test('invitations are disabled when email is not configured', () => {
        mockEmailEnabled = false;
        renderTab();

        expect(screen.getByText('Invitations unavailable')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('teammate@company.com'),
        ).not.toBeInTheDocument();
    });

    test('non-admins cannot see invite or remove controls', () => {
        renderTab({ viewerRole: 'member' });

        expect(screen.getByText('Only admins can invite')).toBeInTheDocument();
        expect(screen.queryAllByTitle('Remove from project')).toHaveLength(0);
    });

    test('an admin can remove a member', async () => {
        const user = userEvent.setup();
        renderTab();

        const removeButtons = screen.getAllByTitle('Remove from project');
        await user.click(removeButtons[0]);

        expect(mockRouterDelete).toHaveBeenCalledWith(
            expect.stringContaining('/projects/1/members/'),
            expect.any(Object),
        );
    });

    test('a logged-in user can join with a pasted invitation code', async () => {
        const user = userEvent.setup();
        renderTab();

        await user.type(
            screen.getByPlaceholderText('Invitation code'),
            'some-token',
        );
        await user.click(screen.getByText('Join'));

        await waitFor(() => {
            expect(mockRouterPost).toHaveBeenCalledWith(
                '/invitations/accept',
                { token: 'some-token' },
                expect.any(Object),
            );
        });
    });
});
