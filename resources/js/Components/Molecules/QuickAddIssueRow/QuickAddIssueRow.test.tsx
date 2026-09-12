import { act, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import QuickAddIssueRow, { QuickAddIssueRowHandle } from './QuickAddIssueRow';

const renderRow = (
    props: Partial<React.ComponentProps<typeof QuickAddIssueRow>> = {},
) =>
    render(
        <table>
            <tbody>
                <QuickAddIssueRow colSpan={5} onSubmit={vi.fn()} {...props} />
            </tbody>
        </table>,
    );

describe('QuickAddIssueRow', () => {
    test('renders collapsed with the default label', () => {
        renderRow();

        expect(screen.getByText('New issue')).toBeInTheDocument();
        expect(
            screen.queryByPlaceholderText('Issue title, press Enter to create'),
        ).not.toBeInTheDocument();
    });

    test('supports a custom label, e.g. for sub-issue quick-add', () => {
        renderRow({ label: 'Add sub-issue' });

        expect(screen.getByText('Add sub-issue')).toBeInTheDocument();
    });

    test('clicking reveals the input', () => {
        renderRow();

        fireEvent.click(screen.getByText('New issue'));

        expect(
            screen.getByPlaceholderText('Issue title, press Enter to create'),
        ).toBeInTheDocument();
    });

    test('pressing Enter with a title calls onSubmit and clears the field', () => {
        const handleSubmit = vi.fn();
        renderRow({ onSubmit: handleSubmit });

        fireEvent.click(screen.getByText('New issue'));
        const input = screen.getByPlaceholderText(
            'Issue title, press Enter to create',
        );
        fireEvent.change(input, { target: { value: 'Fix the bug' } });
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(handleSubmit).toHaveBeenCalledWith('Fix the bug');
        expect(input).toHaveValue('');
    });

    test('pressing Enter with an empty title does not submit', () => {
        const handleSubmit = vi.fn();
        renderRow({ onSubmit: handleSubmit });

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.keyDown(
            screen.getByPlaceholderText('Issue title, press Enter to create'),
            { key: 'Enter' },
        );

        expect(handleSubmit).not.toHaveBeenCalled();
    });

    test('pressing Escape collapses the row back', () => {
        renderRow();

        fireEvent.click(screen.getByText('New issue'));
        fireEvent.keyDown(
            screen.getByPlaceholderText('Issue title, press Enter to create'),
            { key: 'Escape' },
        );

        expect(screen.getByText('New issue')).toBeInTheDocument();
    });

    test('the imperative open() handle reveals the input', () => {
        const ref = createRef<QuickAddIssueRowHandle>();
        render(
            <table>
                <tbody>
                    <QuickAddIssueRow
                        ref={ref}
                        colSpan={5}
                        onSubmit={vi.fn()}
                    />
                </tbody>
            </table>,
        );

        act(() => {
            ref.current?.open();
        });

        expect(
            screen.getByPlaceholderText('Issue title, press Enter to create'),
        ).toBeInTheDocument();
    });
});
