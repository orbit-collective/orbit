import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import OnboardingGate from './OnboardingGate';

const mockPost = vi.fn();
const page = vi.hoisted(() => ({
    component: 'Dashboard',
    props: {} as Record<string, unknown>,
}));

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', () => ({
    router: {
        post: (...args: unknown[]) => mockPost(...args),
        visit: vi.fn(),
    },
    usePage: () => ({ ...page, url: '/' }),
}));

const setPage = (
    user: Record<string, unknown> | null,
    hasProjects = false,
    component = 'Dashboard',
) => {
    page.component = component;
    page.props = {
        auth: { user: user && { id: 1, name: 'Ada', ...user } },
        hasProjects,
    };
};

describe('OnboardingGate', () => {
    beforeEach(() => {
        mockPost.mockReset();
        mockPost.mockImplementation((_url, _data, options) =>
            options?.onFinish?.(),
        );
    });

    test('renders nothing for guests and on auth pages', () => {
        setPage(null);
        const { container, rerender } = render(<OnboardingGate />);
        expect(container).toBeEmptyDOMElement();

        setPage({ has_completed_onboarding: false }, false, 'Auth/Login');
        rerender(<OnboardingGate />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing once all onboarding is done', () => {
        setPage({
            has_completed_onboarding: true,
            has_completed_project_onboarding: true,
        });
        const { container } = render(<OnboardingGate />);

        expect(container).toBeEmptyDOMElement();
    });

    test('starts the tour for a new account', () => {
        setPage({
            has_completed_onboarding: false,
            has_completed_project_onboarding: false,
        });
        render(<OnboardingGate />);

        expect(screen.getByText('Welcome to Orbit')).toBeInTheDocument();
    });

    test('offers only the project chapter to accounts that finished the tour', () => {
        setPage({
            has_completed_onboarding: true,
            has_completed_project_onboarding: false,
        });
        render(<OnboardingGate />);

        expect(
            screen.getByText('Create your first project'),
        ).toBeInTheDocument();
    });

    test('closing settles both pending onboarding flags, one after the other', async () => {
        setPage({
            has_completed_onboarding: false,
            has_completed_project_onboarding: false,
        });
        const { container } = render(<OnboardingGate />);

        await userEvent.click(screen.getByLabelText('Close tour'));

        expect(mockPost.mock.calls.map(([url]) => url)).toEqual([
            '/onboarding.complete',
            '/onboarding.project.complete',
        ]);
        expect(container).toBeEmptyDOMElement();
    });

    test('only settles the flag that is still pending', async () => {
        setPage({
            has_completed_onboarding: true,
            has_completed_project_onboarding: false,
        });
        render(<OnboardingGate />);

        await userEvent.click(screen.getByLabelText('Close tour'));

        expect(mockPost.mock.calls.map(([url]) => url)).toEqual([
            '/onboarding.project.complete',
        ]);
    });

    test('keeps its steps when a project is created mid-tour', () => {
        setPage({
            has_completed_onboarding: true,
            has_completed_project_onboarding: false,
        });
        const { rerender } = render(<OnboardingGate />);

        setPage(
            {
                has_completed_onboarding: true,
                has_completed_project_onboarding: false,
            },
            true,
        );
        rerender(<OnboardingGate />);

        expect(
            screen.getByText('Create your first project'),
        ).toBeInTheDocument();
    });
});
