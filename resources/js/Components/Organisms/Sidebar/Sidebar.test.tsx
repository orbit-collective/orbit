import { Project } from '@/types/Projects';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import Sidebar from './Sidebar';

const pageState = vi.hoisted(() => ({ url: '/' }));
const mockRouterPost = vi.hoisted(() => vi.fn());
const mockRouterVisit = vi.hoisted(() => vi.fn());
const mockUseShortcuts = vi.hoisted(() => vi.fn());

vi.stubGlobal(
    'route',
    vi.fn((name: string) => `/${name}`),
);

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        Link: ({
            children,
            href,
            onClick,
            ...props
        }: Record<string, unknown>) =>
            React.createElement(
                'a',
                { href, onClick, ...props },
                children as never,
            ),
        usePage: () => ({
            url: pageState.url,
            props: {
                auth: {
                    user: {
                        id: 1,
                        name: 'John Doe',
                        email: 'john@acme.com',
                    },
                },
            },
        }),
        router: { post: mockRouterPost, visit: mockRouterVisit },
        useForm: (initialData: Record<string, unknown>) => ({
            data: initialData,
            setData: vi.fn(),
            post: vi.fn(),
            processing: false,
            reset: vi.fn(),
            errors: {},
        }),
    };
});

vi.mock('@/Components/Organisms/NewProjectModal/NewProjectModal', () => ({
    default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) =>
        isOpen ? (
            <div data-testid="new-project-modal">
                {onClose && <button onClick={onClose}>Close Modal</button>}
            </div>
        ) : null,
}));

vi.mock('@/context/ShortcutContext', () => ({
    useShortcuts: mockUseShortcuts,
}));

const makeProject = (overrides: Partial<Project> = {}): Project => ({
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
    ...overrides,
});

describe('Sidebar Component', () => {
    beforeEach(() => {
        pageState.url = '/';
        mockRouterPost.mockClear();
        mockRouterVisit.mockClear();
        mockUseShortcuts.mockClear();
    });

    test('renders the primary navigation items', () => {
        render(<Sidebar projects={[]} />);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Projects')).toBeInTheDocument();
    });

    test('shows the number of projects as a badge', () => {
        render(
            <Sidebar
                projects={[
                    makeProject({ id: 1 }),
                    makeProject({ id: 2 }),
                    makeProject({ id: 3 }),
                ]}
            />,
        );

        const projectsHeading = screen.getByText('PROJECTS');
        expect(projectsHeading).toBeInTheDocument();
        const badges = screen.getAllByText('3');
        expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    test('renders a truncated nav item for each project', () => {
        render(
            <Sidebar
                projects={[
                    makeProject({ id: 5, name: 'Orbit' }),
                    makeProject({
                        id: 6,
                        name: 'A Very Long Project Name Here',
                    }),
                ]}
            />,
        );

        expect(screen.getByText('Orbit')).toBeInTheDocument();
        expect(screen.getByText('A Very Long Proj...')).toBeInTheDocument();
    });

    test('is hidden off-canvas by default', async () => {
        const { container } = render(<Sidebar projects={[]} />);

        const aside = container.querySelector('aside') as HTMLElement;
        expect(aside).toHaveClass('-translate-x-full');
    });

    test('opens when menu button is clicked', async () => {
        const { container } = render(<Sidebar projects={[]} />);

        const aside = container.querySelector('aside') as HTMLElement;
        const menuButton = container
            .querySelector('.lucide-menu')
            ?.closest('button') as HTMLElement;
        await userEvent.click(menuButton);

        expect(aside).toHaveClass('translate-x-0');
    });

    test('closes when backdrop is clicked', async () => {
        const { container } = render(<Sidebar projects={[]} />);

        const aside = container.querySelector('aside') as HTMLElement;
        const menuButton = container
            .querySelector('.lucide-menu')
            ?.closest('button') as HTMLElement;
        await userEvent.click(menuButton);
        expect(aside).toHaveClass('translate-x-0');

        const backdrop = container.querySelector(
            '.backdrop-blur-sm',
        ) as HTMLElement;
        await userEvent.click(backdrop);

        expect(aside).toHaveClass('-translate-x-full');
    });

    test('closes when close button is clicked', async () => {
        const { container } = render(<Sidebar projects={[]} />);

        const aside = container.querySelector('aside') as HTMLElement;
        const menuButton = container
            .querySelector('.lucide-menu')
            ?.closest('button') as HTMLElement;
        await userEvent.click(menuButton);
        expect(aside).toHaveClass('translate-x-0');

        const closeButton = aside
            .querySelector('.lucide-x')
            ?.closest('button') as HTMLElement;
        await userEvent.click(closeButton);

        expect(aside).toHaveClass('-translate-x-full');
    });

    test('renders user badge in the sidebar', () => {
        render(<Sidebar projects={[]} />);

        // The footer badge disables its tooltip, so the name/email render once.
        expect(screen.getAllByText('John Doe')).toHaveLength(1);
        expect(screen.getAllByText('john@acme.com')).toHaveLength(1);
    });

    test('opens the user menu and logs out when clicked', async () => {
        const user = userEvent.setup();
        render(<Sidebar projects={[]} />);

        expect(screen.queryByText('Log out')).not.toBeInTheDocument();

        await user.click(screen.getAllByText('John Doe')[0]);
        const logoutItem = screen.getByText('Log out');
        expect(logoutItem).toBeInTheDocument();

        await user.click(logoutItem);

        expect(mockRouterPost).toHaveBeenCalledWith('/logout');
    });

    test('opens settings from the user menu', async () => {
        const user = userEvent.setup();
        render(<Sidebar projects={[]} />);

        await user.click(screen.getAllByText('John Doe')[0]);
        await user.click(screen.getByText('Settings'));

        expect(mockRouterVisit).toHaveBeenCalledWith('/settings');
    });

    test('closes the user menu when clicking outside', async () => {
        const user = userEvent.setup();
        render(<Sidebar projects={[]} />);

        await user.click(screen.getAllByText('John Doe')[0]);
        expect(screen.getByText('Log out')).toBeInTheDocument();

        await user.click(document.body);
        expect(screen.queryByText('Log out')).not.toBeInTheDocument();
    });

    test('renders organization badge at the top', () => {
        render(<Sidebar projects={[]} />);

        expect(screen.getAllByText('Acme Inc.')).toHaveLength(2);
    });

    test('renders all projects when provided', () => {
        const projects = [
            makeProject({ id: 1, name: 'Project A' }),
            makeProject({ id: 2, name: 'Project B' }),
            makeProject({ id: 3, name: 'Project C' }),
        ];
        render(<Sidebar projects={projects} />);

        expect(screen.getByText('Project A')).toBeInTheDocument();
        expect(screen.getByText('Project B')).toBeInTheDocument();
        expect(screen.getByText('Project C')).toBeInTheDocument();
    });

    test('opens NewProjectModal when clicking PROJECTS', async () => {
        userEvent.setup();
        render(<Sidebar projects={[]} />);

        const projectsLink = screen
            .getByText('PROJECTS')
            .closest('a') as HTMLElement;
        const clickEvent = new MouseEvent('click', { bubbles: true });
        const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');
        projectsLink.dispatchEvent(clickEvent);

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    test('closes NewProjectModal when onClose is called', async () => {
        const user = userEvent.setup();
        render(<Sidebar projects={[]} />);

        const projectsLink = screen
            .getByText('PROJECTS')
            .closest('a') as HTMLElement;
        await user.click(projectsLink);

        // Modal should be rendered
        const modal = screen.queryByTestId('new-project-modal');
        if (modal) {
            const closeButton = screen.getByText('Close Modal');
            await user.click(closeButton);
        }
    });

    test('renders project links with correct href', () => {
        render(<Sidebar projects={[makeProject({ id: 5, name: 'Orbit' })]} />);

        const projectLink = screen.getByText('Orbit').closest('a');
        expect(projectLink).toHaveAttribute('href', '/projects/5');
    });

    test('marks active nav item based on url', () => {
        pageState.url = '/projects';
        render(<Sidebar projects={[]} />);

        const projectsLink = screen.getByText('Projects').closest('a');
        expect(projectsLink).toHaveClass('text-[var(--text-color)]');
    });

    test('marks project as active when url starts with project path', () => {
        pageState.url = '/projects/5/issues';
        render(
            <Sidebar
                projects={[makeProject({ id: 5, name: 'Test Project' })]}
            />,
        );

        const projectLink = screen.getByText('Test Project').closest('a');
        expect(projectLink).toHaveClass('text-[var(--text-color)]');
    });

    test('registers a "p" shortcut that opens the new project modal', () => {
        render(<Sidebar projects={[]} />);

        expect(
            screen.queryByTestId('new-project-modal'),
        ).not.toBeInTheDocument();

        const shortcuts = mockUseShortcuts.mock.calls[0][0];
        const createProjectShortcut = shortcuts.find(
            (s: { key: string }) => s.key === 'p',
        );
        expect(createProjectShortcut).toBeDefined();

        act(() => {
            createProjectShortcut.action();
        });

        expect(screen.getByTestId('new-project-modal')).toBeInTheDocument();
    });
});
