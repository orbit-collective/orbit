import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { buildGithubIssue } from '@/tests/development';
import GithubIssuesPanel from './GithubIssuesPanel';

vi.mock('@/context/AlertContext', () => ({
    useAlert: () => ({ addAlert: vi.fn() }),
}));

const issues = [
    buildGithubIssue({ id: 1, number: 12, title: 'Fix the login redirect' }),
    buildGithubIssue({ id: 2, number: 13, title: 'Żółć in titles' }),
];

const renderPanel = (
    overrides: Partial<Parameters<typeof GithubIssuesPanel>[0]> = {},
) => {
    const props = {
        repositoryUrl: 'https://github.com/orbit-collective/orbit',
        issues,
        state: 'open' as const,
        onStateChange: vi.fn(),
        hasMore: false,
        perPage: 5,
        perPageOptions: [5, 10, 25],
        onPerPageChange: vi.fn(),
        error: null,
        onRetry: vi.fn(),
        onCreateBranch: vi.fn().mockResolvedValue(true),
        busy: false,
        ...overrides,
    };

    return { props, ...render(<GithubIssuesPanel {...props} />) };
};

describe('GithubIssuesPanel', () => {
    test('lists the issues with the state filter as icons', () => {
        renderPanel();

        expect(screen.getByText('Fix the login redirect')).toBeInTheDocument();
        const filter = screen.getByRole('group', {
            name: 'Filter GitHub issues',
        });
        expect(filter.querySelectorAll('button')).toHaveLength(2);
        expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
            'aria-pressed',
            'true',
        );
    });

    test('changes the state and goes back to the first page', async () => {
        const { props } = renderPanel();

        await userEvent.click(screen.getByRole('button', { name: 'Closed' }));

        expect(props.onStateChange).toHaveBeenCalledWith('closed');
    });

    test('creates a branch named after the issue straight away, then shows it done', async () => {
        const { props } = renderPanel();

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Create branch 12-fix-the-login-redirect',
            }),
        );

        expect(props.onCreateBranch).toHaveBeenCalledWith(
            '12-fix-the-login-redirect',
        );
        expect(
            await screen.findByRole('button', {
                name: 'Branch 12-fix-the-login-redirect created',
            }),
        ).toBeDisabled();
        // The other issue still offers its own, with the accents folded away.
        expect(
            screen.getByRole('button', {
                name: 'Create branch 13-zolc-in-titles',
            }),
        ).toBeEnabled();
    });

    test('stays creatable when the branch could not be created', async () => {
        renderPanel({ onCreateBranch: vi.fn().mockResolvedValue(false) });

        await userEvent.click(
            screen.getByRole('button', {
                name: 'Create branch 12-fix-the-login-redirect',
            }),
        );

        expect(
            await screen.findByRole('button', {
                name: 'Create branch 12-fix-the-login-redirect',
            }),
        ).toBeEnabled();
    });

    test('offers no branch buttons without the ability, nor for closed issues', () => {
        const { unmount } = renderPanel({ onCreateBranch: undefined });
        expect(
            screen.queryByRole('button', { name: /Create branch/ }),
        ).not.toBeInTheDocument();
        unmount();

        renderPanel({
            state: 'closed',
            issues: [buildGithubIssue({ state: 'closed' })],
        });
        expect(
            screen.queryByRole('button', { name: /Create branch/ }),
        ).not.toBeInTheDocument();
    });

    test('shows skeletons while loading, an error with a retry, and an empty message', async () => {
        const { unmount } = renderPanel({ issues: null });
        expect(
            screen.getByRole('status', { name: 'Loading GitHub issues' }),
        ).toBeInTheDocument();
        unmount();

        const { props, unmount: unmountError } = renderPanel({
            issues: null,
            error: 'GitHub is down',
        });
        expect(screen.getByRole('alert')).toHaveTextContent('GitHub is down');
        await userEvent.click(
            screen.getByRole('button', { name: 'Try again' }),
        );
        expect(props.onRetry).toHaveBeenCalled();
        unmountError();

        renderPanel({ issues: [] });
        expect(
            screen.getByText('No open issues in this range.'),
        ).toBeInTheDocument();
    });

    test('pages a long list and points to GitHub for the rest', async () => {
        const many = Array.from({ length: 7 }, (_, i) =>
            buildGithubIssue({
                id: i + 1,
                number: i + 1,
                title: `Issue ${i + 1}`,
            }),
        );
        renderPanel({ issues: many, hasMore: true });

        expect(screen.getAllByRole('listitem')).toHaveLength(5);
        await userEvent.click(
            screen.getByRole('button', { name: 'Next page' }),
        );
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(
            screen.getByRole('link', { name: /See all issues on GitHub/ }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/issues',
        );
    });
});
