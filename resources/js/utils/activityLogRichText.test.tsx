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
                    'Issue #5 "Fix login bug" updated by Jane: status changed from "open" to "closed"',
                )}
            </p>,
        );

        expect(
            screen.getByText(/Issue #5 "Fix login bug" updated by Jane:/),
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

    test('leaves unrelated bodies as plain text', () => {
        render(<p>{renderActivityLogBody('Added new task: #12')}</p>);

        expect(screen.getByText('Added new task: #12')).toBeInTheDocument();
    });
});
