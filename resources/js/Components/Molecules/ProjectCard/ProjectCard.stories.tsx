import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { issues, makeIssue, makeProject } from '@/stories/fixtures';
import ProjectCard, { ProjectNewCard } from './ProjectCard';

const meta = {
    title: 'Molecules/ProjectCard',
    component: ProjectCard,
    parameters: { layout: 'centered' },
    decorators: [
        (Story) => (
            <div className="w-[340px]">
                <Story />
            </div>
        ),
    ],
    args: {
        project: makeProject(),
        issues,
    },
} satisfies Meta<typeof ProjectCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A project with a mix of open and closed issues shows its completion ring. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const link = within(canvasElement).getByRole('link');
        await expect(link).toHaveAttribute('href', '/projects/1');
        await expect(within(canvasElement).getByText('Orbit')).toBeVisible();
    },
};

export const NoIssues: Story = {
    args: { issues: [] },
};

export const AllClosed: Story = {
    args: {
        issues: [
            makeIssue({ id: '1', status: 'closed' }),
            makeIssue({ id: '2', status: 'closed' }),
        ],
    },
};

/** Each project color re-themes the icon badge and the hover glow. */
export const Colors: Story = {
    decorators: [
        () => (
            <div className="grid w-[720px] grid-cols-2 gap-4">
                {(['red', 'green', 'sky', 'pink'] as const).map((color) => (
                    <ProjectCard
                        key={color}
                        project={makeProject({
                            name: color,
                            slug: color,
                            color,
                        })}
                        issues={issues}
                    />
                ))}
            </div>
        ),
    ],
};

export const LongName: Story = {
    args: {
        project: makeProject({
            name: 'A very long project name that has to be truncated',
            slug: 'a-very-long-project-slug-that-has-to-be-truncated-as-well',
        }),
    },
};

/** The dashed "new project" tile runs the `project.create` command. */
export const NewProject: Story = {
    render: () => <ProjectNewCard />,
};
