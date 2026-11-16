import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { buildCi, buildPullRequest } from '@/tests/development';
import PullRequestRow from './PullRequestRow';

vi.stubGlobal(
    'route',
    vi.fn(
        (name: string, params: Record<string, number>) =>
            `/${name}/${Object.values(params).join('/')}`,
    ),
);

const renderRow = (props: Partial<Parameters<typeof PullRequestRow>[0]> = {}) =>
    render(
        <PullRequestRow
            projectId={3}
            pullRequest={buildPullRequest()}
            expanded={false}
            onToggle={vi.fn()}
            {...props}
        >
            <p>the detail</p>
        </PullRequestRow>,
    );

describe('PullRequestRow', () => {
    test('shows the title, number, author, branches and state pills', () => {
        renderRow();

        expect(screen.getByText('Add login redirect')).toBeInTheDocument();
        expect(screen.getByText('#7')).toBeInTheDocument();
        expect(screen.getByText('ada')).toBeInTheDocument();
        expect(screen.getByText('feat/login')).toBeInTheDocument();
        expect(screen.getByText('master')).toBeInTheDocument();
        expect(screen.getByText('updated 1d ago')).toBeInTheDocument();
        expect(screen.getByText('Open')).toBeInTheDocument();
        expect(screen.getByText('Checks passed')).toBeInTheDocument();
    });

    test('the title line is one button that reports its state and controls the detail', async () => {
        const onToggle = vi.fn();
        renderRow({ onToggle });

        const toggle = screen.getByRole('button', {
            name: /Add login redirect/,
        });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(toggle).toHaveAttribute('aria-controls');

        await userEvent.click(toggle);
        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    test('mounts the detail only while expanded', () => {
        const { rerender } = renderRow();
        expect(screen.queryByText('the detail')).not.toBeInTheDocument();

        rerender(
            <PullRequestRow
                projectId={3}
                pullRequest={buildPullRequest()}
                expanded
                onToggle={vi.fn()}
            >
                <p>the detail</p>
            </PullRequestRow>,
        );
        expect(screen.getByText('the detail')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: /Add login redirect/ }),
        ).toHaveAttribute('aria-expanded', 'true');
    });

    test('links each issue to its page, outside the toggle button', () => {
        renderRow({
            pullRequest: buildPullRequest({
                issues: [{ id: 12, number: 4, title: 'Fix login' }],
            }),
        });

        const link = screen.getByRole('link', { name: /#4 Fix login/ });
        expect(link).toHaveAttribute('href', '/issues.show/3/12');
        expect(
            screen.getByRole('button', { name: /Add login redirect/ }),
        ).not.toContainElement(link);
    });

    test.each([
        [{ state: 'merged' as const }, 'Merged'],
        [{ state: 'closed' as const }, 'Closed'],
        [{ draft: true }, 'Draft'],
    ])('draws %j as %s', (overrides, label) => {
        renderRow({
            pullRequest: buildPullRequest({ ...overrides, ci: null }),
        });

        expect(screen.getByText(label)).toBeInTheDocument();
    });

    test('shows no CI pill when there is no CI result, and a running one when pending', () => {
        const { unmount } = renderRow({
            pullRequest: buildPullRequest({ ci: null }),
        });
        expect(screen.queryByText(/Checks|No checks/)).not.toBeInTheDocument();
        unmount();

        renderRow({
            pullRequest: buildPullRequest({
                ci: buildCi({ state: 'pending', runs: [] }),
            }),
        });
        expect(screen.getByText('Checks running')).toBeInTheDocument();
    });

    test('copes with a pull request whose author was deleted', () => {
        renderRow({ pullRequest: buildPullRequest({ author: null }) });

        expect(screen.getByText('Add login redirect')).toBeInTheDocument();
    });
});
