import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import {
    paginated,
    portalContainers,
    portalErrorLog,
    portalProjects,
    portalTotals,
    portalUsers,
} from '@/stories/developerPortalFixtures';
import DeveloperPortalTab from './DeveloperPortalTab';
import PortalContainersSection from './PortalContainersSection';
import PortalErrorsSection from './PortalErrorsSection';
import PortalProjectsPanel from './PortalProjectsPanel';
import PortalUsersPanel from './PortalUsersPanel';

const meta = {
    title: 'Organisms/DeveloperPortal',
    component: DeveloperPortalTab,
    parameters: { layout: 'padded', inertia: { url: '/settings/dev-portal' } },
    decorators: [
        (Story) => (
            <div className="mx-auto max-w-3xl">
                <Story />
            </div>
        ),
    ],
    args: {
        totals: portalTotals,
        portalUsers: paginated(portalUsers, 12),
        portalProjects: paginated(portalProjects, 4),
        containers: portalContainers,
        errorLog: portalErrorLog,
    },
} satisfies Meta<typeof DeveloperPortalTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        await expect(
            within(canvasElement).getByText('Container uptime'),
        ).toBeVisible();
    },
};

/** Docker and the log are deferred props: the page paints without them. */
export const Loading: Story = {
    args: { containers: undefined, errorLog: undefined },
};

export const DockerUnavailable: Story = {
    args: {
        containers: {
            available: false,
            error: 'Docker socket not found. Mount /var/run/docker.sock into the app container.',
            containers: [],
        },
    },
};

export const QuietLog: Story = {
    args: { errorLog: { entries: paginated([]), daily: portalErrorLog.daily } },
};

export const NoData: Story = {
    args: {
        totals: {
            ...portalTotals,
            users: 0,
            projects: 0,
            issues: 0,
            comments: 0,
            newIssues: 0,
            newUsers: 0,
            categories: { todo: 0, in_progress: 0, done: 0 },
        },
        portalUsers: paginated([]),
        portalProjects: paginated([]),
        containers: { available: true, error: null, containers: [] },
    },
};

export const Containers: StoryObj<typeof PortalContainersSection> = {
    render: () => <PortalContainersSection containers={portalContainers} />,
};

export const Errors: StoryObj<typeof PortalErrorsSection> = {
    render: () => <PortalErrorsSection errorLog={portalErrorLog} />,
};

export const Users: StoryObj<typeof PortalUsersPanel> = {
    render: () => (
        <PortalUsersPanel users={paginated(portalUsers, 12)} queryParams={{}} />
    ),
};

export const Projects: StoryObj<typeof PortalProjectsPanel> = {
    render: () => (
        <PortalProjectsPanel
            projects={paginated(portalProjects, 4)}
            queryParams={{}}
        />
    ),
};
