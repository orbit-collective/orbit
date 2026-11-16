import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { buildCommit } from '@/tests/development';
import CommitsPanel from './CommitsPanel';

const base = {
    commits: [
        buildCommit(),
        buildCommit({ sha: 'f00dbabe1234', message: 'test: cover it' }),
    ],
    branch: 'master',
    repositoryUrl: 'https://github.com/orbit-collective/orbit',
    error: null,
    onRetry: vi.fn(),
};

describe('CommitsPanel', () => {
    test('lists the commits of the branch and links to all of them', () => {
        render(<CommitsPanel {...base} />);

        expect(screen.getByText('on master')).toBeInTheDocument();
        expect(screen.getByText('test: cover it')).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'All commits on GitHub' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/commits/master',
        );
    });

    test('links to the repository commits when the branch is not known yet', () => {
        render(<CommitsPanel {...base} branch={null} commits={null} />);

        expect(
            screen.getByRole('status', { name: 'Loading commits' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('link', { name: 'All commits on GitHub' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/commits',
        );
    });

    test('says when there are no commits', () => {
        render(<CommitsPanel {...base} commits={[]} />);

        expect(screen.getByText('No commits yet.')).toBeInTheDocument();
    });

    test('shows the error with a way to retry', async () => {
        const onRetry = vi.fn();
        render(
            <CommitsPanel
                {...base}
                commits={null}
                error="GitHub is down"
                onRetry={onRetry}
            />,
        );

        expect(screen.getByRole('alert')).toHaveTextContent('GitHub is down');
        await userEvent.click(
            screen.getByRole('button', { name: 'Try again' }),
        );
        expect(onRetry).toHaveBeenCalled();
    });
});
