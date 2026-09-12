import { ProjectLabelsProvider } from '@/context/ProjectLabelsContext';
import { ProjectLabel } from '@/types/Labels';
import { Project } from '@/types/Projects';
import { AssignableUser } from '@/types/Users';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import NewIssueModal from './NewIssueModal';

// The DatePickerOverlay renders the real Calendar, which relies on useAlert.
const mockAddAlert = vi.hoisted(() => vi.fn());
vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({
        addAlert: mockAddAlert,
        removeAlert: vi.fn(),
        alerts: [],
    }),
}));

// Shared, hoisted mock state so tests can drive `processing` / `errors` and
// assert on the form's `post` / `reset` calls.
const formState = vi.hoisted(() => ({
    processing: false,
    errors: {} as Record<string, string>,
}));
const mockPost = vi.hoisted(() =>
    vi.fn((_url: string, opts?: { onSuccess?: () => void }) =>
        opts?.onSuccess?.(),
    ),
);
const mockReset = vi.hoisted(() => vi.fn());
const mockRoute = vi.hoisted(() => vi.fn((name: string) => `/${name}`));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        Link: ({ children, href, ...props }: Record<string, unknown>) =>
            React.createElement('a', { href, ...props }, children as never),
        useForm: (initial: Record<string, unknown>) => {
            const initialRef = React.useRef(initial);
            const [data, setDataState] =
                React.useState<Record<string, unknown>>(initial);
            const setData = React.useCallback(
                (
                    key:
                        | string
                        | Record<string, unknown>
                        | ((
                              prev: Record<string, unknown>,
                          ) => Record<string, unknown>),
                    value?: unknown,
                ) => {
                    setDataState((prev) => {
                        if (typeof key === 'function') {
                            return key(prev);
                        }
                        return typeof key === 'object'
                            ? key
                            : { ...prev, [key]: value };
                    });
                },
                [],
            );
            const reset = React.useCallback(() => {
                mockReset();
                setDataState(initialRef.current);
            }, []);
            return {
                data,
                setData,
                post: mockPost,
                patch: vi.fn(),
                processing: formState.processing,
                reset,
                errors: formState.errors,
            };
        },
    };
});

const project: Project = {
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
};

const users: AssignableUser[] = [
    { id: 1, name: 'Ada Lovelace', avatar: '/ada.png' },
    { id: 2, name: 'Grace Hopper', avatar: null },
];

const labels: ProjectLabel[] = [
    'bug',
    'feature',
    'performance',
    'design',
    'ux',
    'chore',
].map((name, index) => ({
    id: index + 1,
    name,
    color: '#f44336',
    description: null,
    isSystem: true,
}));

beforeEach(() => {
    vi.stubGlobal('route', mockRoute);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    formState.processing = false;
    formState.errors = {};
});

describe('NewIssueModal Component', () => {
    test('renders the modal header', () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(
            screen.getByRole('heading', { name: /create new issue/i }),
        ).toBeInTheDocument();
    });

    test('renders the backdrop when open', () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(document.querySelector('.backdrop-blur-sm')).toBeInTheDocument();
    });

    test('does not render the backdrop when closed', () => {
        render(
            <NewIssueModal
                isOpen={false}
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(
            document.querySelector('.backdrop-blur-sm'),
        ).not.toBeInTheDocument();
    });

    test('renders a button for every priority and label option', () => {
        render(
            <ProjectLabelsProvider labels={labels}>
                <NewIssueModal
                    isOpen
                    onClose={() => {}}
                    project={project}
                    users={users}
                />
            </ProjectLabelsProvider>,
        );

        ['low', 'medium', 'high'].forEach((p) =>
            expect(
                screen.getByRole('button', { name: new RegExp(p, 'i') }),
            ).toBeInTheDocument(),
        );
        ['bug', 'feature', 'performance', 'design', 'ux', 'chore'].forEach(
            (l) => expect(screen.getByText(l)).toBeInTheDocument(),
        );
    });

    test('lets the user type a title', async () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const title = screen.getByPlaceholderText('Issue title');
        await userEvent.type(title, 'Broken login');

        expect(title).toHaveValue('Broken login');
    });

    test('lets the user type a description', async () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const description = screen.getByPlaceholderText('Add a description...');
        await userEvent.type(description, 'Fails on submit');

        expect(description).toHaveValue('Fails on submit');
    });

    test('toggles a label on and off when its badge is clicked', async () => {
        render(
            <ProjectLabelsProvider labels={labels}>
                <NewIssueModal
                    isOpen
                    onClose={() => {}}
                    project={project}
                    users={users}
                />
            </ProjectLabelsProvider>,
        );

        const badge = screen.getByText('bug').closest('span') as HTMLElement;
        expect(badge).not.toHaveClass('border-[var(--accent-color)]');

        await userEvent.click(badge);
        expect(badge).toHaveClass('border-[var(--accent-color)]');

        await userEvent.click(badge);
        expect(badge).not.toHaveClass('border-[var(--accent-color)]');
    });

    test('highlights the priority button the user selects', async () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const high = screen.getByRole('button', { name: /high/i });
        expect(high).not.toHaveClass('bg-[var(--bg-light-color)]');

        await userEvent.click(high);

        expect(high).toHaveClass('bg-[var(--bg-light-color)]');
    });

    test('submits the form, posting to the issues.store route and closing on success', async () => {
        const handleClose = vi.fn();
        render(
            <NewIssueModal
                isOpen
                onClose={handleClose}
                project={project}
                users={users}
            />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: /create issue/i }),
        );

        expect(mockRoute).toHaveBeenCalledWith('issues.store');
        expect(mockPost).toHaveBeenCalledTimes(1);
        // The mocked post fires onSuccess, which closes the modal and resets.
        expect(handleClose).toHaveBeenCalledTimes(1);
        expect(mockReset).toHaveBeenCalled();
    });

    test('disables the submit button and shows a pending label while submitting', () => {
        formState.processing = true;
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const submit = screen.getByRole('button', { name: /creating/i });
        expect(submit).toBeInTheDocument();
        expect(submit).toBeDisabled();
    });

    test('shows validation errors returned from the server', () => {
        formState.errors = { title: 'The title field is required.' };
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(
            screen.getByText('The title field is required.'),
        ).toBeInTheDocument();
    });

    test('shows a validation error for the description field', () => {
        formState.errors = { description: 'The description is too long.' };
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(
            screen.getByText('The description is too long.'),
        ).toBeInTheDocument();
    });

    test('defaults the assignee picker to "Unassigned"', () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    test('lists every user plus an "Unassigned" option when the assignee picker opens', async () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();

        await userEvent.click(screen.getByText('Unassigned'));

        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.getByText('Grace Hopper')).toBeInTheDocument();
        expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(1);
    });

    test('selects a user as the assignee and closes the dropdown', async () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        await userEvent.click(screen.getByText('Unassigned'));
        await userEvent.click(screen.getByText('Ada Lovelace'));

        expect(screen.queryByText('Grace Hopper')).not.toBeInTheDocument();
        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    });

    test('can reassign back to "Unassigned" after picking a user', async () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        await userEvent.click(screen.getByText('Unassigned'));
        await userEvent.click(screen.getByText('Ada Lovelace'));
        await userEvent.click(screen.getByText('Ada Lovelace'));

        const unassignedOptions = screen.getAllByText('Unassigned');
        await userEvent.click(unassignedOptions[unassignedOptions.length - 1]);

        expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
    });
});

describe('NewIssueModal date pickers', () => {
    // The DatePickerOverlay's Calendar is a framer-motion component that
    // runs a real (non-faked) exit animation, so assertions depending on it
    // being fully closed go through `waitFor`.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const calendarButtons = (container: HTMLElement) =>
        Array.from(container.querySelectorAll('.lucide-calendar')).map(
            (el) => el.closest('button') as HTMLElement,
        );

    test('defaults the start date to today and the end date to a week later', () => {
        render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        expect(screen.getByText('2026-07-25')).toBeInTheDocument();
        expect(screen.getByText('2026-08-01')).toBeInTheDocument();
    });

    test('opens the start date calendar when its date button is clicked', async () => {
        const { container } = render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const [startDateButton] = calendarButtons(container);
        await userEvent.click(startDateButton);

        expect(screen.getByText('Today')).toBeInTheDocument();
        expect(screen.getByText('Close')).toBeInTheDocument();
    });

    test('opening the end date calendar closes the start date calendar', async () => {
        const { container } = render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const [startDateButton, endDateButton] = calendarButtons(container);
        await userEvent.click(startDateButton);
        await waitFor(() =>
            expect(screen.getAllByText('Today')).toHaveLength(1),
        );

        await userEvent.click(endDateButton);
        await waitFor(() =>
            expect(screen.getAllByText('Today')).toHaveLength(1),
        );
    });

    test('pushes the end date forward when a later start date is selected', async () => {
        const { container } = render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const [startDateButton] = calendarButtons(container);
        await userEvent.click(startDateButton);
        // Move to August, which is after the default end date (Aug 1).
        const nextMonthButton = document
            .querySelector('.lucide-chevron-right')
            ?.closest('button') as HTMLElement;
        await userEvent.click(nextMonthButton);
        await userEvent.click(screen.getByText('15'));
        await userEvent.click(screen.getByText('Close'));
        await waitFor(() =>
            expect(screen.queryByText('Today')).not.toBeInTheDocument(),
        );

        // Both fields now show the newly picked (later) start date.
        expect(screen.getAllByText('2026-08-15')).toHaveLength(2);
    });

    test('keeps the end date unchanged when the new start date is still before it', async () => {
        const { container } = render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const [startDateButton] = calendarButtons(container);
        await userEvent.click(startDateButton);
        await userEvent.click(screen.getByText('20'));
        await userEvent.click(screen.getByText('Close'));
        await waitFor(() =>
            expect(screen.queryByText('Today')).not.toBeInTheDocument(),
        );

        expect(screen.getByText('2026-07-20')).toBeInTheDocument();
        expect(screen.getByText('2026-08-01')).toBeInTheDocument();
    });

    test('selects an end date directly without touching the start date', async () => {
        const { container } = render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const [, endDateButton] = calendarButtons(container);
        await userEvent.click(endDateButton);
        // The end calendar opens on its own selectedDate's month (August,
        // the default end date), so no month navigation is needed here.
        await userEvent.click(screen.getByText('10'));
        await userEvent.click(screen.getByText('Close'));
        await waitFor(() =>
            expect(screen.queryByText('Today')).not.toBeInTheDocument(),
        );

        expect(screen.getByText('2026-07-25')).toBeInTheDocument();
        expect(screen.getByText('2026-08-10')).toBeInTheDocument();
    });

    test('closes the date picker overlay when the backdrop is clicked', async () => {
        const { container } = render(
            <NewIssueModal
                isOpen
                onClose={() => {}}
                project={project}
                users={users}
            />,
        );

        const [startDateButton] = calendarButtons(container);
        await userEvent.click(startDateButton);
        expect(screen.getByText('Today')).toBeInTheDocument();

        const backdrop = container.querySelector(
            '[class*="backdrop-blur-[2px]"]',
        ) as HTMLElement;
        await userEvent.click(backdrop);

        await waitFor(() =>
            expect(screen.queryByText('Today')).not.toBeInTheDocument(),
        );
    });
});
