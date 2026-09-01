import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { renderActivityLogBody } from './activityLogRichText';

describe('renderActivityLogBody', () => {
    test('renders a status change as StatusDot + label components', () => {
        render(
            <p>
                {renderActivityLogBody(
                    'status changed from "open" to "closed"',
                )}
            </p>,
        );

        expect(screen.getByText('open')).toBeInTheDocument();
        expect(screen.getByText('closed')).toBeInTheDocument();
        expect(document.querySelectorAll('.rounded-sm')).not.toHaveLength(0);
    });

    test('renders "in_progress" with the underscore replaced by a space', () => {
        render(
            <p>
                {renderActivityLogBody(
                    'status changed from "open" to "in_progress"',
                )}
            </p>,
        );

        expect(screen.getByText('in progress')).toBeInTheDocument();
    });

    test('renders a priority change as StatusDot + label components', () => {
        render(
            <p>
                {renderActivityLogBody('priority changed from "low" to "high"')}
            </p>,
        );

        expect(screen.getByText('low')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
    });

    test('renders each label as a Badge chip', () => {
        render(<p>{renderActivityLogBody('labels changed to [bug, ux]')}</p>);

        expect(screen.getByText('bug')).toBeInTheDocument();
        expect(screen.getByText('ux')).toBeInTheDocument();
    });

    test('renders "none" when the labels list is empty', () => {
        render(<p>{renderActivityLogBody('labels changed to [none]')}</p>);

        expect(screen.getByText('none')).toBeInTheDocument();
    });

    test('keeps surrounding plain text untouched', () => {
        render(
            <p>
                {renderActivityLogBody(
                    'Issue "Fix login bug" updated by Jane: status changed from "open" to "closed"',
                )}
            </p>,
        );

        expect(
            screen.getByText(/Issue "Fix login bug" updated by Jane:/),
        ).toBeInTheDocument();
    });

    test('renders multiple changes joined by a semicolon in one body', () => {
        render(
            <p>
                {renderActivityLogBody(
                    'status changed from "open" to "closed"; priority changed from "low" to "high"',
                )}
            </p>,
        );

        expect(screen.getByText('closed')).toBeInTheDocument();
        expect(screen.getByText('high')).toBeInTheDocument();
    });

    test('renders "#123" issue references as a Badge', () => {
        const { container } = render(
            <p>{renderActivityLogBody('Added new task: #12')}</p>,
        );

        expect(screen.getByText('#12')).toBeInTheDocument();
        expect(screen.getByText('Added new task:')).toBeInTheDocument();
        expect(container.querySelector('.rounded-lg')).not.toBeNull();
    });

    test('renders each side of an assignee change as a bold name with an avatar', () => {
        render(
            <p>
                {renderActivityLogBody(
                    'assignee changed from Adam Nowak to Ewa Kowalska',
                )}
            </p>,
        );

        expect(screen.getByText('Adam Nowak')).toBeInTheDocument();
        expect(screen.getByText('Ewa Kowalska')).toBeInTheDocument();
    });

    test('renders "Unassigned" with the unassigned icon instead of an avatar', () => {
        const { container } = render(
            <p>
                {renderActivityLogBody(
                    'assignee changed from Adam Nowak to Unassigned',
                )}
            </p>,
        );

        expect(screen.getByText('Unassigned')).toBeInTheDocument();
        // Adam Nowak gets an avatar (initials "A"); Unassigned gets the
        // UserX icon instead - only one rounded-full avatar should exist.
        expect(screen.getByText('A')).toBeInTheDocument();
        expect(container.querySelectorAll('.rounded-full')).toHaveLength(1);
    });

    test('renders an assignee change alongside a status change in one body', () => {
        render(
            <p>
                {renderActivityLogBody(
                    'Issue #7 "Fix login bug" updated by Jane: assignee changed from Adam Nowak to Unassigned; status changed from "open" to "closed"',
                )}
            </p>,
        );

        expect(screen.getByText('#7')).toBeInTheDocument();
        expect(screen.getByText('Adam Nowak')).toBeInTheDocument();
        expect(screen.getByText('Unassigned')).toBeInTheDocument();
        expect(screen.getByText('closed')).toBeInTheDocument();
    });

    test('uses the real avatar photo for an assignee found in the users list', () => {
        const { container } = render(
            <p>
                {renderActivityLogBody(
                    'assignee changed from Unassigned to Kacper Bieliński',
                    [
                        {
                            id: 1,
                            name: 'Kacper Bieliński',
                            avatar: '/storage/avatars/kacper.jpg',
                        },
                    ],
                )}
            </p>,
        );

        const avatarImg = container.querySelector('img');
        expect(avatarImg).not.toBeNull();
        expect(avatarImg).toHaveAttribute('src', '/storage/avatars/kacper.jpg');
    });

    test('falls back to initials when the assignee is not in the users list', () => {
        const { container } = render(
            <p>
                {renderActivityLogBody(
                    'assignee changed from Unassigned to Kacper Bieliński',
                    [],
                )}
            </p>,
        );

        expect(container.querySelector('img')).toBeNull();
        expect(screen.getByText('K')).toBeInTheDocument();
    });
});
