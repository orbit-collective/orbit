import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { UserPreview } from '@/types/Users';
import UserPreviewCard from './UserPreviewCard';

const user: UserPreview = {
    id: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    avatar: null,
    recentIssues: [
        {
            id: 10,
            number: 4,
            title: 'Fix login redirect',
            project_id: 1,
            workflowStatus: null,
            updated_at: new Date().toISOString(),
        },
    ],
};

const anchorRect = new DOMRect(40, 40, 24, 24);

describe('UserPreviewCard', () => {
    test('shows the name, email and recently edited issues', () => {
        render(<UserPreviewCard user={user} anchorRect={anchorRect} />);

        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
        expect(screen.getByText('#4')).toBeInTheDocument();
        expect(screen.getByText('Fix login redirect')).toBeInTheDocument();
    });

    test('shows an empty state without recent issues', () => {
        render(
            <UserPreviewCard
                user={{ ...user, recentIssues: [] }}
                anchorRect={anchorRect}
            />,
        );

        expect(screen.getByText('No recent issues')).toBeInTheDocument();
    });
});
