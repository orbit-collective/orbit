import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { portalContainers } from '@/stories/developerPortalFixtures';
import PortalContainersSection from './PortalContainersSection';

vi.mock('./ContainerLogs', () => ({
    default: ({ containerId }: { containerId: string }) => (
        <div data-testid="logs" data-id={containerId} />
    ),
}));

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
});

describe('PortalContainersSection', () => {
    test('shows a loading state while the deferred prop is missing', () => {
        render(<PortalContainersSection />);

        expect(screen.getByRole('status')).toHaveTextContent('Reading Docker');
    });

    test('explains why Docker is unavailable', () => {
        render(
            <PortalContainersSection
                containers={{
                    available: false,
                    error: 'Docker socket not found.',
                    containers: [],
                }}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Docker socket not found.',
        );
    });

    test('falls back to a generic message without an error text', () => {
        render(
            <PortalContainersSection
                containers={{ available: false, error: null, containers: [] }}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent(
            'Docker is not available.',
        );
    });

    test('lists every container with its uptime, health and restarts', () => {
        render(<PortalContainersSection containers={portalContainers} />);

        expect(screen.getAllByText('app').length).toBeGreaterThan(0);
        expect(screen.getAllByText('redis').length).toBeGreaterThan(0);
        expect(screen.getByText('healthy')).toBeInTheDocument();
        expect(screen.getByText('1 restarts')).toBeInTheDocument();
        expect(screen.getAllByText('3h').length).toBeGreaterThan(0);
        expect(screen.getAllByText('2d 2h').length).toBeGreaterThan(0);
        expect(screen.getByText('exited')).toBeInTheDocument();
    });

    test('summarises how many containers run and how many do not', () => {
        render(<PortalContainersSection containers={portalContainers} />);

        expect(screen.getByText('2/3')).toBeInTheDocument();
        expect(screen.getByText(/1\s+not running/)).toBeInTheDocument();
    });

    test('charts only running containers', () => {
        render(<PortalContainersSection containers={portalContainers} />);

        expect(screen.getAllByTestId('bar')).toHaveLength(2);
    });

    test('uptime keeps counting without a server round trip', () => {
        render(
            <PortalContainersSection
                containers={{
                    available: true,
                    error: null,
                    containers: [
                        {
                            ...portalContainers.containers[0],
                            startedAt: new Date(
                                Date.now() - 59 * 60_000 - 50_000,
                            ).toISOString(),
                        },
                    ],
                }}
            />,
        );

        expect(screen.getAllByText('59m').length).toBeGreaterThan(0);

        act(() => {
            vi.advanceTimersByTime(15_000);
        });

        expect(screen.getAllByText('1h').length).toBeGreaterThan(0);
    });

    test('an empty list shows the empty chart text', () => {
        render(
            <PortalContainersSection
                containers={{ available: true, error: null, containers: [] }}
            />,
        );

        expect(screen.getByText('No running containers.')).toBeInTheDocument();
    });

    test('clicking a container opens its details and logs, clicking again closes them', () => {
        render(<PortalContainersSection containers={portalContainers} />);
        expect(screen.queryByTestId('logs')).not.toBeInTheDocument();

        const row = screen.getByRole('button', { name: /orbit-redis-1/ });
        expect(row).toHaveAttribute('aria-expanded', 'false');

        fireEvent.click(row);

        expect(row).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByTestId('logs')).toHaveAttribute('data-id', 'b2');
        expect(screen.getByText('Up 2 days (healthy)')).toBeInTheDocument();

        fireEvent.click(row);
        expect(screen.queryByTestId('logs')).not.toBeInTheDocument();
    });

    test('a stopped container still opens, with "not running" as its start', () => {
        render(<PortalContainersSection containers={portalContainers} />);

        fireEvent.click(screen.getByRole('button', { name: /orbit-backup-1/ }));

        expect(screen.getByText('not running')).toBeInTheDocument();
    });
});
