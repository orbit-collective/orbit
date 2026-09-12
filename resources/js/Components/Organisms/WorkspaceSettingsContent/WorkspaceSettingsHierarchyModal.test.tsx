import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsHierarchyModal from './WorkspaceSettingsHierarchyModal';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
);

const routerMock = vi.hoisted(() => ({
    patch: vi.fn(),
}));

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: routerMock,
    };
});

const epicType: IssueType = {
    id: 1,
    name: 'Epic',
    icon: 'Zap',
    color: '#a855f7',
    description: null,
    isSystem: true,
    allowsChildren: true,
    requiredFields: [],
    restrictedRoleTypes: [],
    allowedChildTypeIds: [2],
};

const storyType: IssueType = {
    id: 2,
    name: 'Story',
    icon: 'BookOpen',
    color: '#22c55e',
    description: null,
    isSystem: true,
    allowsChildren: false,
    requiredFields: [],
    restrictedRoleTypes: [],
};

const bugType: IssueType = {
    id: 3,
    name: 'Bug',
    icon: 'Bug',
    color: '#ef4444',
    description: null,
    isSystem: true,
    allowsChildren: false,
    requiredFields: [],
    restrictedRoleTypes: [],
};

const renderModal = (
    props: Partial<Parameters<typeof WorkspaceSettingsHierarchyModal>[0]>,
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsHierarchyModal
                isOpen
                onClose={vi.fn()}
                projectId={1}
                issueType={epicType}
                allIssueTypes={[epicType, storyType, bugType]}
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsHierarchyModal', () => {
    test('shows a hint instead of options when the type does not allow children', () => {
        renderModal({ issueType: { ...epicType, allowsChildren: false } });

        expect(
            screen.getByText(/Turn on "Allows sub-issues"/),
        ).toBeInTheDocument();
    });

    test('lists every other issue type as a toggle, excluding the type itself', () => {
        renderModal({ canUpdateIssueTypes: true });

        expect(screen.getByText('Story')).toBeInTheDocument();
        expect(screen.getByText('Bug')).toBeInTheDocument();
        expect(screen.queryAllByText('Epic')).toHaveLength(0);
    });

    test('marks the already-allowed type as pressed', () => {
        renderModal({ canUpdateIssueTypes: true });

        expect(screen.getByText('Story').closest('button')).toHaveAttribute(
            'aria-pressed',
            'true',
        );
        expect(screen.getByText('Bug').closest('button')).toHaveAttribute(
            'aria-pressed',
            'false',
        );
    });

    test('toggling an unlisted type patches the full next set of allowed ids', () => {
        renderModal({ canUpdateIssueTypes: true });

        fireEvent.click(screen.getByText('Bug'));

        expect(routerMock.patch).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.allowed-children.update'),
            { child_issue_type_ids: [2, 3] },
            expect.any(Object),
        );
    });

    test('toggling an already-allowed type removes it from the set', () => {
        renderModal({ canUpdateIssueTypes: true });

        fireEvent.click(screen.getByText('Story'));

        expect(routerMock.patch).toHaveBeenCalledWith(
            expect.stringContaining('issue-types.allowed-children.update'),
            { child_issue_type_ids: [] },
            expect.any(Object),
        );
    });

    test('toggles are disabled without canUpdateIssueTypes', () => {
        renderModal({ canUpdateIssueTypes: false });

        expect(screen.getByText('Story').closest('button')).toBeDisabled();
    });

    test('renders nothing when no issue type is given', () => {
        renderModal({ issueType: null });

        expect(
            screen.queryByText('Which types can be sub-issues'),
        ).not.toBeInTheDocument();
    });
});
