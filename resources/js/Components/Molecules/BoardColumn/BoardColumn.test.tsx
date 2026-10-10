import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { BoardColumnMeta } from '@/types/Components';
import { Issue } from '@/types/Issues';
import BoardColumn from './BoardColumn';

let counter = 0;
const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: `ISSUE-${counter++}`,
    title: 'Some issue',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

const highMeta: BoardColumnMeta = {
    id: 'high',
    label: 'High Priority',
    hint: 'Fix immediately',
    accent: 'var(--error-color)',
    icon: 'Flame',
};

describe('BoardColumn Component', () => {
    test('renders the column heading from meta', () => {
        render(<BoardColumn issues={[]} meta={highMeta} count={0} />);

        expect(screen.getByText('High Priority')).toBeInTheDocument();
        expect(screen.getByText('Fix immediately')).toBeInTheDocument();
    });

    test('shows the empty state when there are no issues', () => {
        render(<BoardColumn issues={[]} meta={highMeta} count={0} />);

        expect(screen.getByText('No issues')).toBeInTheDocument();
    });

    test('renders an issue card for each issue', () => {
        const issues = [
            makeIssue({ title: 'First issue' }),
            makeIssue({ title: 'Second issue' }),
        ];
        render(<BoardColumn issues={issues} meta={highMeta} count={2} />);

        expect(screen.getByText('First issue')).toBeInTheDocument();
        expect(screen.getByText('Second issue')).toBeInTheDocument();
        expect(screen.queryByText('No issues')).not.toBeInTheDocument();
    });

    test('renders the count prop verbatim in the badge', () => {
        render(<BoardColumn issues={[]} meta={highMeta} count={7} />);

        expect(screen.getByText('7')).toBeInTheDocument();
    });
});
