import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import EditableSelect from './EditableSelect';

const OPTIONS = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'closed', label: 'Closed' },
];

describe('EditableSelect Component', () => {
    test('renders the label of the currently selected option', () => {
        render(
            <EditableSelect value="open" options={OPTIONS} onSave={() => {}} />,
        );

        expect(screen.getByRole('button')).toHaveTextContent('Open');
    });

    test('does not render the dropdown menu until clicked', () => {
        render(
            <EditableSelect value="open" options={OPTIONS} onSave={() => {}} />,
        );

        expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
    });

    test('clicking the trigger opens the dropdown with every option', async () => {
        render(
            <EditableSelect value="open" options={OPTIONS} onSave={() => {}} />,
        );

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByText('In Progress')).toBeInTheDocument();
        expect(screen.getByText('Closed')).toBeInTheDocument();
    });

    test('selecting a different option calls onSave with its value and closes the menu', async () => {
        const handleSave = vi.fn();
        render(
            <EditableSelect
                value="open"
                options={OPTIONS}
                onSave={handleSave}
            />,
        );

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('In Progress'));

        expect(handleSave).toHaveBeenCalledWith('in_progress');
        expect(screen.queryByText('Closed')).not.toBeInTheDocument();
    });

    test('selecting the already-active option does not call onSave', async () => {
        const handleSave = vi.fn();
        render(
            <EditableSelect
                value="open"
                options={OPTIONS}
                onSave={handleSave}
            />,
        );

        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getAllByText('Open')[1]);

        expect(handleSave).not.toHaveBeenCalled();
    });

    test('clicking outside the component closes the dropdown', async () => {
        render(
            <div>
                <EditableSelect
                    value="open"
                    options={OPTIONS}
                    onSave={() => {}}
                />
                <button>Outside</button>
            </div>,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Open' }));
        expect(screen.getByText('In Progress')).toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'Outside' }));

        expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
    });

    test('uses renderValue to customize the trigger display', () => {
        render(
            <EditableSelect
                value="open"
                options={OPTIONS}
                onSave={() => {}}
                renderValue={(value) => `Status: ${value}`}
            />,
        );

        expect(screen.getByRole('button')).toHaveTextContent('Status: open');
    });

    test('falls back to the raw value when it matches no option', () => {
        render(
            <EditableSelect
                value="unknown_status"
                options={OPTIONS}
                onSave={() => {}}
            />,
        );

        expect(screen.getByRole('button')).toHaveTextContent('unknown_status');
    });

    test('renders a header above the options when provided', async () => {
        render(
            <EditableSelect
                value="open"
                options={OPTIONS}
                onSave={() => {}}
                header="Change status to..."
            />,
        );

        await userEvent.click(screen.getByRole('button'));

        expect(screen.getByText('Change status to...')).toBeInTheDocument();
    });

    test('shows a checkmark next to the currently selected option', async () => {
        render(
            <EditableSelect value="open" options={OPTIONS} onSave={() => {}} />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Open' }));

        const openItem = screen.getAllByText('Open')[1].closest('button');
        expect(openItem?.querySelector('svg')).toBeInTheDocument();

        const inProgressItem = screen
            .getByText('In Progress')
            .closest('button');
        expect(inProgressItem?.querySelector('svg')).not.toBeInTheDocument();
    });

    test('does not open the dropdown when disabled', async () => {
        render(
            <EditableSelect
                value="open"
                options={OPTIONS}
                onSave={() => {}}
                disabled
            />,
        );

        expect(screen.getByRole('button')).toBeDisabled();

        await userEvent.click(screen.getByRole('button'));
        expect(screen.queryByText('In Progress')).not.toBeInTheDocument();
    });

    test('does not show a search input for short option lists', async () => {
        render(
            <EditableSelect value="open" options={OPTIONS} onSave={() => {}} />,
        );

        await userEvent.click(screen.getByRole('button'));

        expect(
            screen.queryByPlaceholderText('Search…'),
        ).not.toBeInTheDocument();
    });

    test('shows a search input and filters options for long lists', async () => {
        const manyOptions = Array.from({ length: 8 }, (_, i) => ({
            value: `user-${i}`,
            label: `User ${i}`,
            searchLabel: `User ${i}`,
        }));
        render(
            <EditableSelect
                value="user-0"
                options={manyOptions}
                onSave={() => {}}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'User 0' }));
        await userEvent.type(screen.getByPlaceholderText('Search…'), 'User 3');

        expect(screen.getByText('User 3')).toBeInTheDocument();
        expect(screen.queryByText('User 4')).not.toBeInTheDocument();
    });

    test('shows an empty state when the search has no matches', async () => {
        const manyOptions = Array.from({ length: 8 }, (_, i) => ({
            value: `user-${i}`,
            label: `User ${i}`,
            searchLabel: `User ${i}`,
        }));
        render(
            <EditableSelect
                value="user-0"
                options={manyOptions}
                onSave={() => {}}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'User 0' }));
        await userEvent.type(
            screen.getByPlaceholderText('Search…'),
            'nobody-matches-this',
        );

        expect(screen.getByText('No matches found')).toBeInTheDocument();
    });
});
