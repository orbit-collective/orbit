import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import EditableLabelList from './EditableLabelList';

describe('EditableLabelList Component', () => {
    test('renders "None" and an add button when there are no labels', () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} />);

        expect(screen.getByText('None')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Edit labels' }),
        ).toBeInTheDocument();
    });

    test('renders every current label as a pill', () => {
        render(
            <EditableLabelList labels={['bug', 'feature']} onSave={() => {}} />,
        );

        expect(screen.getByText('bug')).toBeInTheDocument();
        expect(screen.getByText('feature')).toBeInTheDocument();
        expect(screen.queryByText('None')).not.toBeInTheDocument();
    });

    test('does not show the picker until the add button is clicked', () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} />);

        expect(
            screen.queryByPlaceholderText('Change or add labels...'),
        ).not.toBeInTheDocument();
    });

    test('clicking the add button opens a picker listing every available label', async () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );

        expect(
            screen.getByPlaceholderText('Change or add labels...'),
        ).toBeInTheDocument();
        expect(screen.getByText('Labels')).toBeInTheDocument();
        expect(screen.getByText('chore')).toBeInTheDocument();
    });

    test('typing in the search field filters the label list', async () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        await userEvent.type(
            screen.getByPlaceholderText('Change or add labels...'),
            'bu',
        );

        expect(screen.getByText('bug')).toBeInTheDocument();
        expect(screen.queryByText('feature')).not.toBeInTheDocument();
    });

    test('shows a "No labels found." message when the search matches nothing', async () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        await userEvent.type(
            screen.getByPlaceholderText('Change or add labels...'),
            'nonexistent',
        );

        expect(screen.getByText('No labels found.')).toBeInTheDocument();
    });

    test('clicking an unselected label in the picker adds it', async () => {
        const handleSave = vi.fn();
        render(<EditableLabelList labels={['bug']} onSave={handleSave} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        await userEvent.click(screen.getByRole('button', { name: /design/i }));

        expect(handleSave).toHaveBeenCalledWith(['bug', 'design']);
    });

    test('clicking an already-selected label in the picker removes it', async () => {
        const handleSave = vi.fn();
        render(
            <EditableLabelList
                labels={['bug', 'design']}
                onSave={handleSave}
            />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        await userEvent.click(screen.getByRole('button', { name: /design/i }));

        expect(handleSave).toHaveBeenCalledWith(['bug']);
    });

    test('shows a checkmark next to selected labels in the picker', async () => {
        render(<EditableLabelList labels={['bug']} onSave={() => {}} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );

        const bugRow = screen.getByRole('button', { name: /bug/i });
        expect(bugRow.querySelector('svg')).toBeInTheDocument();

        const featureRow = screen.getByRole('button', { name: /feature/i });
        expect(featureRow.querySelector('svg')).not.toBeInTheDocument();
    });

    test('clicking outside the component closes the picker', async () => {
        render(
            <div>
                <EditableLabelList labels={[]} onSave={() => {}} />
                <button>Outside</button>
            </div>,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        expect(
            screen.getByPlaceholderText('Change or add labels...'),
        ).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Outside' }));

        expect(
            screen.queryByPlaceholderText('Change or add labels...'),
        ).not.toBeInTheDocument();
    });

    test('does not open the picker when disabled', async () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} disabled />);

        expect(
            screen.getByRole('button', { name: 'Edit labels' }),
        ).toBeDisabled();

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );

        expect(
            screen.queryByPlaceholderText('Change or add labels...'),
        ).not.toBeInTheDocument();
    });

    test('shows the results count for the label list', async () => {
        render(<EditableLabelList labels={[]} onSave={() => {}} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );

        expect(screen.getByText('6 results')).toBeInTheDocument();
    });

    test('selects every label via "Select all"', async () => {
        const handleSave = vi.fn();
        render(<EditableLabelList labels={[]} onSave={handleSave} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        await userEvent.click(screen.getByText('Select all'));

        expect(handleSave).toHaveBeenCalledWith([
            'bug',
            'feature',
            'performance',
            'design',
            'ux',
            'chore',
        ]);
    });

    test('deselects every label via "Select all" when all are already selected', async () => {
        const handleSave = vi.fn();
        render(
            <EditableLabelList
                labels={[
                    'bug',
                    'feature',
                    'performance',
                    'design',
                    'ux',
                    'chore',
                ]}
                onSave={handleSave}
            />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit labels' }),
        );
        await userEvent.click(screen.getByText('Select all'));

        expect(handleSave).toHaveBeenCalledWith([]);
    });
});
