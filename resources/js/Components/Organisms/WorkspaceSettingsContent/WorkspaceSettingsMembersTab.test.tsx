import { AlertProvider } from '@/context/AlertContext';
import {
    MemberProjectSummary,
    PendingProjectInvitation,
    ProjectMember,
} from '@/types/ProjectMembers';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsMembersTab from './WorkspaceSettingsMembersTab';

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

type VisitOptions = {
    onStart?: () => void;
    onSuccess?: () => void;
    onError?: (errors: Record<string, string>) => void;
    onFinish?: () => void;
};

const { mockRouterPost, mockRouterPatch, mockRouterDelete, mockRouterGet } =
    vi.hoisted(() => ({
        mockRouterPost: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onStart?.();
                opts?.onSuccess?.();
                opts?.onFinish?.();
            },
        ),
        mockRouterPatch: vi.fn(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onSuccess?.();
            },
        ),
        mockRouterDelete: vi.fn((_url: string, opts?: VisitOptions) => {
            opts?.onSuccess?.();
        }),
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

    test("an admin can change a member's role via the role dropdown", async () => {
        const user = userEvent.setup();
        renderTab();

        const roleTriggers = screen.getAllByText('Member');
        await user.click(roleTriggers[0]);
        const adminOptions = screen.getAllByText('Admin');
        await user.click(adminOptions[adminOptions.length - 1]);

        expect(mockRouterPatch).toHaveBeenCalledWith(
            '/projects/1/members/2',
            { role: 'admin' },
            expect.any(Object),
        );
    });

    test('non-admins see a static role badge instead of a dropdown', () => {
        renderTab({ viewerRole: 'member' });

        expect(screen.getAllByText('Admin')).toHaveLength(1);
        expect(screen.getAllByText('Member')).toHaveLength(1);
    });

    test('switching the active project navigates to its members', async () => {
        const otherProject: MemberProjectSummary = {
            id: 2,
            name: 'Second Project',
            color: 'green',
        };
        const user = userEvent.setup();
        renderTab({ memberProjects: [project, otherProject] });

        await user.click(screen.getByText('Orbit'));
        await user.click(screen.getByText('Second Project'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/settings?tab=members&project=2',
            {},
            expect.any(Object),
        );
    });

    test('shows an empty state for pending invitations when there are none', () => {
        renderTab();

        expect(screen.getByText('No pending invitations')).toBeInTheDocument();
    });

    test('lists pending invitations and lets an admin revoke one', async () => {
        const invitation: PendingProjectInvitation = {
            id: 5,
            email: 'invitee@example.com',
            role: 'member',
            invitedByName: 'Ada Admin',
            expiresAt: new Date().toISOString(),
        };
        const user = userEvent.setup();
        renderTab({ pendingInvitations: [invitation] });

        expect(screen.getByText('invitee@example.com')).toBeInTheDocument();

        await user.click(screen.getByText('Revoke'));

        expect(mockRouterDelete).toHaveBeenCalledWith(
            '/projects/1/invitations/5',
            expect.any(Object),
        );
    });

    test('shows an inline and toast error when inviting fails validation', async () => {
        mockRouterPost.mockImplementationOnce(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onError?.({ email: 'This user is already a member.' });
                opts?.onFinish?.();
            },
        );
        const user = userEvent.setup();
        renderTab();

        await user.type(
            screen.getByPlaceholderText('teammate@company.com'),
            'existing@example.com',
        );
        await user.click(screen.getByText('Invite'));

        expect(
            await screen.findAllByText('This user is already a member.'),
        ).not.toHaveLength(0);
    });

    test('shows an inline and toast error when joining with a bad code fails', async () => {
        mockRouterPost.mockImplementationOnce(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onError?.({ token: 'This invitation link is invalid.' });
                opts?.onFinish?.();
            },
        );
        const user = userEvent.setup();
        renderTab();

        await user.type(
            screen.getByPlaceholderText('Invitation code'),
            'bad-token',
        );
        await user.click(screen.getByText('Join'));

        expect(
            await screen.findAllByText('This invitation link is invalid.'),
        ).not.toHaveLength(0);
    });

    test('shows a toast error when changing a role fails', async () => {
        mockRouterPatch.mockImplementationOnce(
            (_url: string, _data?: unknown, opts?: VisitOptions) => {
                opts?.onError?.({
                    role: 'A project must have at least one admin.',
                });
            },
        );
        const user = userEvent.setup();
        renderTab();

        const roleTriggers = screen.getAllByText('Admin');
        await user.click(roleTriggers[0]);
        const memberOptions = screen.getAllByText('Member');
        await user.click(memberOptions[0]);

        expect(
            await screen.findAllByText(
                'A project must have at least one admin.',
            ),
        ).not.toHaveLength(0);
    });

    test('shows a toast error when removing a member fails', async () => {
        mockRouterDelete.mockImplementationOnce(
            (_url: string, opts?: VisitOptions) => {
                opts?.onError?.({
                    member: 'A project must have at least one admin.',
                });
            },
        );
        const user = userEvent.setup();
        renderTab();

        const removeButtons = screen.getAllByTitle('Remove from project');
        await user.click(removeButtons[0]);

        expect(
            await screen.findAllByText(
                'A project must have at least one admin.',
            ),
        ).not.toHaveLength(0);
    });

    test('pending invitations are hidden from non-admins', () => {
        const invitation: PendingProjectInvitation = {
            id: 5,
            email: 'invitee@example.com',
            role: 'member',
            invitedByName: 'Ada Admin',
            expiresAt: new Date().toISOString(),
        };
        renderTab({ viewerRole: 'member', pendingInvitations: [invitation] });

        expect(
            screen.queryByText('invitee@example.com'),
        ).not.toBeInTheDocument();
    });
});
