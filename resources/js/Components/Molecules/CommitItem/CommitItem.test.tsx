import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { buildCommit } from '@/tests/development';
import CommitItem from './CommitItem';

const renderItem = (commit = buildCommit()) =>
    render(
        <ul>
            <CommitItem commit={commit} />
        </ul>,
    );

describe('CommitItem', () => {
    test('shows the subject as a link, the short sha and who made it', () => {
        renderItem();

        expect(
            screen.getByRole('link', { name: 'fix: keep the redirect target' }),
        ).toHaveAttribute(
            'href',
            'https://github.com/orbit-collective/orbit/commit/deadbeefcafe',
        );
        expect(screen.getByText('deadbee')).toBeInTheDocument();
        expect(screen.getByText(/ada · 2d ago/)).toBeInTheDocument();
    });

    test('falls back to the commit author name and shows no age without a date', () => {
        renderItem(buildCommit({ author: null, committedAt: null }));

        expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
        expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
        expect(screen.getByText('AD')).toBeInTheDocument();
    });
});
