import { Issue } from '@/types/Issues';
import { Project } from '@/types/Projects';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import IssuePageHeader from './IssuePageHeader';

vi.stubGlobal(
    'route',
    vi.fn((name: string, id?: string | number) => `/${name}/${id ?? ''}`),
);

vi.mock('@inertiajs/react', () => ({
    Link: ({ children, href, ...props }: Record<string, unknown>) =>
        React.createElement('a', { href, ...props }, children as never),
}));

const project: Project = {
    id: 1,
    name: 'Orbit',
    slug: 'orbit',
    description: '',
    color: 'purple',
    created_at: 0,
    updated_at: 0,
};

const issue: Issue = {
    id: '42',
    title: 'Fix login crash',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
};

describe('IssuePageHeader Component', () => {
    test('renders the breadcrumb with the project name and issue title', () => {
        render(<IssuePageHeader project={project} issue={issue} />);

        expect(screen.getByText('Orbit')).toBeInTheDocument();
        expect(screen.getByText('Issues')).toBeInTheDocument();
        expect(screen.getByText('#42 Fix login crash')).toBeInTheDocument();
    });

    test('links the project name and back button to the project page', () => {
        render(<IssuePageHeader project={project} issue={issue} />);

        expect(screen.getByText('Orbit').closest('a')).toHaveAttribute(
            'href',
            '/projects.show/1',
        );
        expect(
            screen.getByRole('link', { name: 'Back to project' }),
        ).toHaveAttribute('href', '/projects.show/1');
    });

    test('copies the current page link to the clipboard when clicked', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, { clipboard: { writeText } });

        render(<IssuePageHeader project={project} issue={issue} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Copy issue link' }),
        );

        expect(writeText).toHaveBeenCalledWith(window.location.href);
    });
});

describe('IssuePageHeader breadcrumb', () => {
    const epic: Issue = {
        id: '10',
        title: 'Checkout revamp',
        status: 'open',
        priority: 'high',
        project_id: 1,
        user_id: 1,
    };

    test('renders each ancestor as a link back to it', () => {
        render(
            <IssuePageHeader
                project={project}
                issue={issue}
                ancestors={[epic]}
            />,
        );

        const crumb = screen.getByRole('link', { name: /Checkout revamp/ });
        expect(crumb).toBeInTheDocument();
        expect(crumb).toHaveAttribute('href', expect.stringContaining('10'));
    });

    test('renders no ancestor crumbs for a root issue', () => {
        render(<IssuePageHeader project={project} issue={issue} />);

        expect(
            screen.queryByRole('link', { name: /Checkout revamp/ }),
        ).not.toBeInTheDocument();
    });

    test('keeps the issue itself as the last, non-link crumb', () => {
        render(
            <IssuePageHeader
                project={project}
                issue={issue}
                ancestors={[epic]}
            />,
        );

        expect(screen.getByText(/#42/)).toBeInTheDocument();
    });
});
