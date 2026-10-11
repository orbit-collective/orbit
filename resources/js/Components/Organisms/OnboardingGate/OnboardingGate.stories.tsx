import type { Meta, StoryObj } from '@storybook/react-vite';
import OnboardingGate from './OnboardingGate';

const user = {
    id: 1,
    name: 'Jane Cooper',
    email: 'jane@orbit.dev',
    avatar: null,
    has_completed_onboarding: false,
    has_completed_project_onboarding: false,
    session_lifetime: 120,
    has_password: true,
    github_username: null,
};

const meta = {
    title: 'Organisms/OnboardingGate',
    component: OnboardingGate,
    parameters: {
        layout: 'fullscreen',
        inertia: { url: '/', props: { auth: { user }, hasProjects: false } },
    },
} satisfies Meta<typeof OnboardingGate>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new account gets the full product tour. */
export const NewAccount: Story = {};

/** Only the optional "create your first project" chapter is left. */
export const ProjectChapterOnly: Story = {
    parameters: {
        inertia: {
            props: {
                auth: { user: { ...user, has_completed_onboarding: true } },
                hasProjects: false,
            },
        },
    },
};

/** Nothing is pending, so the gate renders nothing. */
export const Completed: Story = {
    parameters: {
        inertia: {
            props: {
                auth: {
                    user: {
                        ...user,
                        has_completed_onboarding: true,
                        has_completed_project_onboarding: true,
                    },
                },
                hasProjects: true,
            },
        },
    },
};
