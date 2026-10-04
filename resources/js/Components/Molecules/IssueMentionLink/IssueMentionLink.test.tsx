import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import IssueMentionLink from './IssueMentionLink';

const mockAxios = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('axios', () => ({ default: mockAxios }));

beforeEach(() => {
    mockAxios.get.mockReset();
    globalThis.route = vi.fn(
        (name: string, params: unknown[]) => `/${name}/${params.join('/')}`,
    ) as unknown as typeof globalThis.route;
});

describe('IssueMentionLink', () => {
    test('links to the issue in the project', () => {
        render(
            <IssueMentionLink
                projectId={7}
                issueId={2}
                title="Fix login"
                label="#2"
            />,
        );

        expect(screen.getByRole('link', { name: '#2' })).toHaveAttribute(
            'href',
            '/issues.show/7/2',
        );
    });

    test('shows the preview card on hover and hides it on leave', async () => {
        mockAxios.get.mockResolvedValue({
            data: {
                id: 3,
                title: 'Card title',
                status: 'closed',
                priority: 'low',
                labels: [],
                assignee: { id: 1, name: 'Jane Cooper' },
            },
        });
        render(
            <IssueMentionLink
                projectId={7}
                issueId={3}
                title="Card title"
                label="#3"
            />,
        );

        const link = screen.getByRole('link', { name: '#3' });
        await userEvent.hover(link);

        expect(await screen.findByText('Jane Cooper')).toBeInTheDocument();
        expect(mockAxios.get).toHaveBeenCalledWith(
            '/projects.issues.preview/7/3',
        );

        await userEvent.unhover(link);
        await waitFor(() =>
            expect(screen.queryByText('Jane Cooper')).not.toBeInTheDocument(),
        );
    });

    test('refetches a preview once the cached copy has expired', async () => {
        const now = vi.spyOn(Date, 'now');
        now.mockReturnValue(1_000);
        mockAxios.get.mockResolvedValue({
            data: {
                id: 5,
                title: 'Old',
                status: 'open',
                priority: 'low',
                labels: [],
            },
        });
        render(
            <IssueMentionLink
                projectId={7}
                issueId={5}
                title="Old"
                label="#5"
            />,
        );
        const link = screen.getByRole('link', { name: '#5' });

        await userEvent.hover(link);
        await waitFor(() => expect(mockAxios.get).toHaveBeenCalledTimes(1));
        await userEvent.unhover(link);

        await userEvent.hover(link);
        await userEvent.unhover(link);
        expect(mockAxios.get).toHaveBeenCalledTimes(1);

        now.mockReturnValue(1_000 + 31_000);
        await userEvent.hover(link);
        await waitFor(() => expect(mockAxios.get).toHaveBeenCalledTimes(2));
        now.mockRestore();
    });

    test('shows no card when the preview cannot be loaded', async () => {
        mockAxios.get.mockRejectedValue(new Error('404'));
        render(
            <IssueMentionLink
                projectId={7}
                issueId={4}
                title="Gone"
                label="#4"
            />,
        );

        await userEvent.hover(screen.getByRole('link', { name: '#4' }));

        await waitFor(() => expect(mockAxios.get).toHaveBeenCalled());
        expect(screen.queryByText('Unassigned')).not.toBeInTheDocument();
    });
});
