import { ModalProvider } from '@/context/ModalContext';
import { ShortcutProvider } from '@/context/ShortcutContext';
import { Project } from '@/types/Projects';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import TopNav from './TopNav';

const mockRoute = vi.hoisted(() => vi.fn((name: string) => `/${name}`));

vi.mock('@inertiajs/react', async () => {
    const React = await import('react');
    return {
        Link: ({ children, href, ...props }: Record<string, unknown>) =>
            React.createElement('a', { href, ...props }, children as never),
        usePage: () => ({
            props: { auth: { user: { id: 1 } }, notifications: [] },
        }),
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
            const reset = React.useCallback(
                () => setDataState(initialRef.current),
                [],
            );
            return {
                data,
                setData,
                post: vi.fn(),
                patch: vi.fn(),
                processing: false,
                reset,
                errors: {},
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

beforeEach(() => {
    vi.stubGlobal('route', mockRoute);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

const renderTopNav = (props: any) => {
    return render(
        <ModalProvider>
            <ShortcutProvider>
                <TopNav {...props} />
            </ShortcutProvider>
        </ModalProvider>,
    );
};

describe('TopNav Component', () => {
    test('renders the project name', () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(
            screen.getByRole('heading', { name: 'Orbit' }),
        ).toBeInTheDocument();
    });

    test('renders the List and Board view toggles', () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(
            screen.getByRole('button', { name: /list/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /board/i }),
        ).toBeInTheDocument();
    });

    test('highlights the currently selected view', () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(screen.getByRole('button', { name: /list/i })).toHaveClass(
            'text-[var(--text-color)]',
        );
        expect(screen.getByRole('button', { name: /board/i })).toHaveClass(
            'text-[var(--text-gray-color)]',
        );
    });

    test('highlights the Calendar view icon when it is selected', () => {
        renderTopNav({
            selectedLook: 'Calendar',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        const calendarButton = screen.getByRole('button', {
            name: /calendar/i,
        });
        expect(calendarButton).toHaveClass('text-[var(--text-color)]');
        expect(
            calendarButton.querySelector('.lucide-calendar-days'),
        ).toHaveClass('text-[var(--text-color)]');
    });

    test('switches the view when a toggle is clicked', async () => {
        const setSelectedLook = vi.fn();
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: setSelectedLook,
            project: project,
            users: [],
        });

        fireEvent.click(screen.getByRole('button', { name: /board/i }));

        expect(setSelectedLook).toHaveBeenCalledWith('Board');
    });

    test('switches back to the List view when the List toggle is clicked', async () => {
        const setSelectedLook = vi.fn();
        renderTopNav({
            selectedLook: 'Board',
            setSelectedLook: setSelectedLook,
            project: project,
            users: [],
        });

        fireEvent.click(screen.getByRole('button', { name: /list/i }));

        expect(setSelectedLook).toHaveBeenCalledWith('List');
    });

    test('opens the new issue modal when the "New issue" button is clicked', async () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(
            document.querySelector('.backdrop-blur-sm'),
        ).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /new issue/i }));

        await waitFor(() => {
            expect(
                document.querySelector('.backdrop-blur-sm'),
            ).toBeInTheDocument();
        });
    });

    test('closes the new issue modal when the backdrop is clicked', async () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        fireEvent.click(screen.getByRole('button', { name: /new issue/i }));

        const backdrop = await waitFor(() => {
            const el = document.querySelector('.backdrop-blur-sm');
            expect(el).toBeInTheDocument();
            return el as Element;
        });

        fireEvent.click(backdrop);

        await waitFor(() => {
            expect(
                document.querySelector('.backdrop-blur-sm'),
            ).not.toBeInTheDocument();
        });
    });

    test('opens the new issue modal with the "Ctrl + I" shortcut', async () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(
            document.querySelector('.backdrop-blur-sm'),
        ).not.toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'i', ctrlKey: true });

        await waitFor(() => {
            expect(
                document.querySelector('.backdrop-blur-sm'),
            ).toBeInTheDocument();
        });
    });

    test('opens the new issue modal with the "c" shortcut', async () => {
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(
            document.querySelector('.backdrop-blur-sm'),
        ).not.toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'c' });

        await waitFor(() => {
            expect(
                document.querySelector('.backdrop-blur-sm'),
            ).toBeInTheDocument();
        });
    });

    test('switches to the Calendar view when its toggle is clicked', () => {
        const setSelectedLook = vi.fn();
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: setSelectedLook,
            project: project,
            users: [],
        });

        fireEvent.click(screen.getByRole('button', { name: /calendar/i }));

        expect(setSelectedLook).toHaveBeenCalledWith('Calendar');
    });

    test('switches to the List view with the "1" keyboard shortcut', async () => {
        const setSelectedLook = vi.fn();
        renderTopNav({
            selectedLook: 'Board',
            setSelectedLook: setSelectedLook,
            project: project,
            users: [],
        });

        fireEvent.keyDown(window, { key: '1' });

        await waitFor(() =>
            expect(setSelectedLook).toHaveBeenCalledWith('List'),
        );
    });

    test('switches to the Board view with the "2" keyboard shortcut', async () => {
        const setSelectedLook = vi.fn();
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: setSelectedLook,
            project: project,
            users: [],
        });

        fireEvent.keyDown(window, { key: '2' });

        await waitFor(() =>
            expect(setSelectedLook).toHaveBeenCalledWith('Board'),
        );
    });

    test('switches to the Calendar view with the "3" keyboard shortcut', async () => {
        const setSelectedLook = vi.fn();
        renderTopNav({
            selectedLook: 'List',
            setSelectedLook: setSelectedLook,
            project: project,
            users: [],
        });

        fireEvent.keyDown(window, { key: '3' });

        await waitFor(() =>
            expect(setSelectedLook).toHaveBeenCalledWith('Calendar'),
        );
    });

    test('opens the notifications popup when the bell button is clicked, and closes it on a second click', () => {
        const { container } = renderTopNav({
            selectedLook: 'List',
            setSelectedLook: () => {},
            project: project,
            users: [],
        });

        expect(
            screen.queryByRole('heading', { name: 'Notifications' }),
        ).not.toBeInTheDocument();

        const bellButton = container
            .querySelector('.lucide-bell')
            ?.closest('button') as HTMLElement;
        fireEvent.click(bellButton);

        expect(
            screen.getByRole('heading', { name: 'Notifications' }),
        ).toBeInTheDocument();

        fireEvent.click(bellButton);

        expect(
            screen.queryByRole('heading', { name: 'Notifications' }),
        ).not.toBeInTheDocument();
    });
});
