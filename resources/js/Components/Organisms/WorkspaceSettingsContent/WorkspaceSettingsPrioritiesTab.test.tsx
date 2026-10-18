import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { priorities } from '@/stories/fixtures';
import { SettingsPriority } from '@/types/Priorities';
import { MemberProjectSummary } from '@/types/ProjectMembers';
import WorkspaceSettingsPrioritiesTab from './WorkspaceSettingsPrioritiesTab';

const mockRouterGet = vi.hoisted(() => vi.fn());

vi.mock('@inertiajs/react', async () => {
    const actual =
        await vi.importActual<typeof import('@inertiajs/react')>(
            '@inertiajs/react',
        );
    return {
        ...actual,
        usePage: () => ({ props: { flash: {} } }),
        router: { ...actual.router, get: mockRouterGet },
    };
});

const project: MemberProjectSummary = { id: 1, name: 'Orbit', color: 'blue' };
const settingsPriorities: SettingsPriority[] = priorities.map(
    (priority, index) => ({ ...priority, issueCount: [4, 9, 1][index] }),
);

const renderTab = (
    props: Partial<Parameters<typeof WorkspaceSettingsPrioritiesTab>[0]> = {},
) =>
    render(
        <WorkspaceSettingsPrioritiesTab
            memberProjects={[project]}
            selectedProjectId={1}
            priorities={settingsPriorities}
            hasPrioritiesAccess
            {...props}
        />,
    );

beforeEach(() => mockRouterGet.mockClear());

describe('WorkspaceSettingsPrioritiesTab', () => {
    test('lists the project priorities in order with their issue counts', () => {
        renderTab();

        // One row per priority, most important first (High, Medium, Low).
        expect(
            screen
                .getAllByText(/^\d+ issues?$/)
                .map((node) => node.textContent),
        ).toEqual(['4 issues', '9 issues', '1 issue']);
        expect(screen.getByText('High')).toBeInTheDocument();
        expect(screen.getByText('Low')).toBeInTheDocument();
    });

    test('marks the default priority', () => {
        renderTab();

        expect(screen.getAllByText('Default')).toHaveLength(1);
    });

    test('summarises the scale in the stat cards', () => {
        renderTab();

        expect(screen.getByText('Priority levels')).toBeInTheDocument();
        expect(screen.getByText('Default for new issues')).toBeInTheDocument();
        expect(screen.getByText('14')).toBeInTheDocument();
    });

    test('shows "None" as the default when the project flags no default', () => {
        renderTab({
            priorities: settingsPriorities.map((priority) => ({
                ...priority,
                isDefault: false,
            })),
        });

        expect(screen.getByText('None')).toBeInTheDocument();
    });

    test("switching project loads that project's priorities", async () => {
        const user = userEvent.setup();
        renderTab({
            memberProjects: [project, { id: 2, name: 'Mobile', color: 'red' }],
        });

        await user.click(screen.getByText('Mobile'));

        expect(mockRouterGet).toHaveBeenCalledWith(
            '/settings/priorities?project=2',
            {},
            { preserveScroll: true, preserveState: true },
        );
    });

    test('explains when the user is not in any project', () => {
        renderTab({ memberProjects: [], selectedProjectId: null });

        expect(
            screen.getByText("You're not part of any project yet"),
        ).toBeInTheDocument();
    });

    test('explains when the user lacks the view permission', () => {
        renderTab({ hasPrioritiesAccess: false, priorities: [] });

        expect(
            screen.getByText(
                "You don't have access to this project's priorities",
            ),
        ).toBeInTheDocument();
        expect(screen.queryByText('Priority levels')).not.toBeInTheDocument();
    });
});
