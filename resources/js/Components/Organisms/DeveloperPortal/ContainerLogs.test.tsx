import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ContainerLogs, { lineTone } from './ContainerLogs';

const hook = vi.hoisted(() => ({
    state: {
        lines: [] as unknown[],
        error: null as string | null,
        loading: false,
        loaded: true,
        refresh: vi.fn(),
    },
    useContainerLogs: vi.fn(),
}));
const alert = vi.hoisted(() => ({ addAlert: vi.fn() }));

vi.mock('@/hooks/useContainerLogs', () => ({
    useContainerLogs: (...args: unknown[]) => {
        hook.useContainerLogs(...args);
        return hook.state;
    },
}));
vi.mock('@/context/AlertContext', () => ({ useAlert: () => alert }));

const lines = [
    { time: '2026-11-04T10:00:00Z', stream: 'stdout', text: 'server started' },
    {
        time: '2026-11-04T10:00:01Z',
        stream: 'stdout',
        text: 'Deprecated: old api',
    },
    {
        time: '2026-11-04T10:00:02Z',
        stream: 'stdout',
        text: 'Exception: kaboom',
    },
    { time: null, stream: 'stderr', text: 'plain stderr line' },
];

beforeEach(() => {
    hook.useContainerLogs.mockClear();
    hook.state.refresh.mockClear();
    alert.addAlert.mockClear();
    Object.assign(hook.state, {
        lines,
        error: null,
        loading: false,
        loaded: true,
    });
});

describe('lineTone', () => {
    test('stderr and error words are errors, warnings are warnings', () => {
        expect(lineTone({ time: null, stream: 'stderr', text: 'x' })).toBe(
            'error',
        );
        expect(
            lineTone({ time: null, stream: 'stdout', text: 'FATAL: no' }),
        ).toBe('error');
        expect(
            lineTone({ time: null, stream: 'stdout', text: 'Warning: hm' }),
        ).toBe('warning');
        expect(
            lineTone({ time: null, stream: 'stdout', text: 'all good' }),
        ).toBe('normal');
    });
});

describe('ContainerLogs', () => {
    test('asks the hook for this container, following by default', () => {
        render(<ContainerLogs containerId="abc123" />);

        expect(hook.useContainerLogs).toHaveBeenCalledWith('abc123', {
            enabled: true,
            follow: true,
        });
        expect(screen.getByText(/following/)).toHaveTextContent('4 of 4 lines');
    });

    test('renders lines tagged by tone', () => {
        render(<ContainerLogs containerId="abc" />);

        expect(
            screen.getByText('Exception: kaboom').closest('[data-tone]'),
        ).toHaveAttribute('data-tone', 'error');
        expect(
            screen.getByText('Deprecated: old api').closest('[data-tone]'),
        ).toHaveAttribute('data-tone', 'warning');
        expect(
            screen.getByText('server started').closest('[data-tone]'),
        ).toHaveAttribute('data-tone', 'normal');
    });

    test('filters lines as you type', () => {
        render(<ContainerLogs containerId="abc" />);

        fireEvent.change(screen.getByPlaceholderText('Filter lines'), {
            target: { value: 'KABOOM' },
        });

        expect(screen.getByText('Exception: kaboom')).toBeInTheDocument();
        expect(screen.queryByText('server started')).not.toBeInTheDocument();
        expect(screen.getByText(/1 of 4 lines/)).toBeInTheDocument();
    });

    test('"Errors only" keeps errors and warnings', () => {
        render(<ContainerLogs containerId="abc" />);

        fireEvent.click(screen.getByRole('button', { name: 'Errors only' }));

        expect(screen.queryByText('server started')).not.toBeInTheDocument();
        expect(screen.getByText('plain stderr line')).toBeInTheDocument();
        expect(screen.getByText('Deprecated: old api')).toBeInTheDocument();
    });

    test('says when nothing matches', () => {
        render(<ContainerLogs containerId="abc" />);

        fireEvent.change(screen.getByPlaceholderText('Filter lines'), {
            target: { value: 'zzz' },
        });

        expect(screen.getByText('No lines match.')).toBeInTheDocument();
    });

    test('says when the container has no output', () => {
        hook.state.lines = [];
        render(<ContainerLogs containerId="abc" />);

        expect(screen.getByText('No output yet.')).toBeInTheDocument();
    });

    test('shows loading and error states', () => {
        hook.state.loaded = false;
        const { rerender } = render(<ContainerLogs containerId="abc" />);
        expect(screen.getByText('Loading logs…')).toBeInTheDocument();

        Object.assign(hook.state, { loaded: true, error: 'Docker said no' });
        rerender(<ContainerLogs containerId="abc" />);
        expect(screen.getByText('Docker said no')).toBeInTheDocument();
    });

    test('Follow toggles live updating off and on', () => {
        render(<ContainerLogs containerId="abc" />);

        fireEvent.click(screen.getByRole('button', { name: 'Follow' }));

        expect(hook.useContainerLogs).toHaveBeenLastCalledWith('abc', {
            enabled: true,
            follow: false,
        });
        expect(screen.queryByText(/following/)).not.toBeInTheDocument();
    });

    test('the refresh button re-reads', () => {
        render(<ContainerLogs containerId="abc" />);

        fireEvent.click(screen.getByRole('button', { name: 'Refresh logs' }));

        expect(hook.state.refresh).toHaveBeenCalledTimes(1);
    });

    test('copies the visible lines', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });
        render(<ContainerLogs containerId="abc" />);

        fireEvent.change(screen.getByPlaceholderText('Filter lines'), {
            target: { value: 'started' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Copy logs' }));
        await Promise.resolve();

        expect(writeText).toHaveBeenCalledWith('server started');
        await vi.waitFor(() =>
            expect(alert.addAlert).toHaveBeenCalledWith(
                'Logs copied',
                'success',
            ),
        );
    });

    test('reports a clipboard failure', async () => {
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockRejectedValue(new Error('no')),
            },
        });
        render(<ContainerLogs containerId="abc" />);

        fireEvent.click(screen.getByRole('button', { name: 'Copy logs' }));

        await vi.waitFor(() =>
            expect(alert.addAlert).toHaveBeenCalledWith(
                'Could not copy the logs',
                'error',
            ),
        );
    });
});
