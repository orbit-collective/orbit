import { AlertProvider } from '@/context/AlertContext';
import { IssueType } from '@/types/IssueTypes';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import WorkspaceSettingsIssueTypesTab from './WorkspaceSettingsIssueTypesTab';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params?: Array<string | number>) =>
            `/${name}/${(params ?? []).join('/')}`,
    ),
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
            delete: vi.fn(),
        },
    };
});

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const issueTypes: IssueType[] = [
    {
        id: 1,
        name: 'Bug',
        icon: 'Bug',
        color: '#ef4444',
        description: null,
        isSystem: true,
        allowsChildren: false,
        requiredFields: [],
        restrictedRoleTypes: [],
    },
    {
        id: 2,
        name: 'Custom Type',
        icon: 'Star',
        color: '#000000',
        description: null,
        isSystem: false,
        allowsChildren: false,
        requiredFields: [],
        restrictedRoleTypes: [],
    },
];

const renderTab = (
    props: Partial<Parameters<typeof WorkspaceSettingsIssueTypesTab>[0]>,
) =>
    render(
        <AlertProvider>
            <WorkspaceSettingsIssueTypesTab
                memberProjects={[project]}
                selectedProjectId={1}
                issueTypes={issueTypes}
                hasIssueTypesAccess
                {...props}
            />
        </AlertProvider>,
    );

describe('WorkspaceSettingsIssueTypesTab', () => {
    test('renders every issue type name', () => {
        renderTab({});

        expect(screen.getByText('Bug')).toBeInTheDocument();
        expect(screen.getByText('Custom Type')).toBeInTheDocument();
    });

    test('marks system issue types with a "System" badge', () => {
        renderTab({});

        expect(screen.getByText('System')).toBeInTheDocument();
    });

    test('without delete permission, no delete controls are shown', () => {
        renderTab({});

        expect(
            screen.queryByTitle('Delete issue type'),
        ).not.toBeInTheDocument();
    });

    test('with delete permission, only the custom type gets a delete control', () => {
        renderTab({ canDeleteIssueTypes: true });

        expect(screen.getAllByTitle('Delete issue type')).toHaveLength(1);
    });

    test("shows a fallback message when the user has no access to this project's issue types", () => {
        renderTab({ hasIssueTypesAccess: false });

        expect(
            screen.getByText(
                "You don't have access to this project's issue types",
            ),
        ).toBeInTheDocument();
    });
});
