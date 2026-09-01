import { Issue } from '@/types/Issues';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import IssuePreviewCard from './IssuePreviewCard';

const makeRect = (overrides: Partial<DOMRect> = {}): DOMRect => ({
    top: 100,
    bottom: 120,
    left: 50,
    right: 100,
    width: 50,
    height: 20,
    x: 50,
    y: 100,
    toJSON: () => ({}),
    ...overrides,
});

const makeIssue = (overrides: Partial<Issue> = {}): Issue => ({
    id: '1',
    title: 'Fix login bug',
    status: 'open',
    priority: 'high',
    project_id: 1,
    user_id: 1,
    ...overrides,
});

describe('IssuePreviewCard Component', () => {
    test('renders the issue title, status and priority', () => {
        render(
            <IssuePreviewCard
                issue={makeIssue({ status: 'in_progress', priority: 'high' })}
                anchorRect={makeRect()}
            />,
        );

        expect(screen.getByText('Fix login bug')).toBeInTheDocument();
        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
    });

    test('renders each label', () => {
        render(
            <IssuePreviewCard
                issue={makeIssue({ labels: ['bug', 'ux'] })}
                anchorRect={makeRect()}
            />,
        );

        expect(screen.getByText('bug')).toBeInTheDocument();
        expect(screen.getByText('ux')).toBeInTheDocument();
    });

    test('renders the assignee name and avatar when present', () => {
        render(
            <IssuePreviewCard
                issue={makeIssue({
                    assignee: {
                        id: 5,
                        name: 'Jane Doe',
                        avatar: '/storage/avatars/jane.jpg',
                        email: 'jane@example.com',
                        created_at: '',
                        updated_at: '',
                    },
                })}
                anchorRect={makeRect()}
            />,
        );

        expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    test('shows "Unassigned" when there is no assignee', () => {
        render(
            <IssuePreviewCard
                issue={makeIssue({ assignee: undefined })}
                anchorRect={makeRect()}
            />,
        );

        expect(screen.getByText('Unassigned')).toBeInTheDocument();
    });

    test('renders a single date when start and end match', () => {
        render(
            <IssuePreviewCard
                issue={makeIssue({
                    start_date: '2026-08-15',
                    end_date: '2026-08-15',
                })}
                anchorRect={makeRect()}
            />,
        );

        expect(screen.getByText('Aug 15')).toBeInTheDocument();
    });

    test('renders a date range when start and end differ', () => {
        render(
            <IssuePreviewCard
                issue={makeIssue({
                    start_date: '2026-08-15',
                    end_date: '2026-08-17',
                })}
                anchorRect={makeRect()}
            />,
        );

        expect(screen.getByText('Aug 15 – Aug 17')).toBeInTheDocument();
    });

    test('renders no date range when the issue has no start_date', () => {
        const { container } = render(
            <IssuePreviewCard
                issue={makeIssue({ start_date: undefined })}
                anchorRect={makeRect()}
            />,
        );

        expect(container.querySelector('.lucide-calendar-range')).toBeNull();
    });

    test('flips above the anchor when there is not enough room below', () => {
        const originalInnerHeight = window.innerHeight;
        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: 200,
        });

        const { container } = render(
            <IssuePreviewCard
                issue={makeIssue()}
                anchorRect={makeRect({ top: 150, bottom: 180 })}
            />,
        );

        const card = container.firstChild as HTMLElement;
        expect(parseFloat(card.style.top)).toBeLessThan(150);

        Object.defineProperty(window, 'innerHeight', {
            configurable: true,
            value: originalInnerHeight,
        });
    });
});
