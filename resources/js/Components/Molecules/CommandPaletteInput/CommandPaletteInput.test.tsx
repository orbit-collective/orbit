import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, test, vi } from 'vitest';
import CommandPaletteInput from './CommandPaletteInput';

const baseProps = {
    value: '',
    onChange: vi.fn(),
    onKeyDown: vi.fn(),
    placeholder: 'Type a command...',
    listboxId: 'list-1',
    expanded: true,
};

describe('CommandPaletteInput', () => {
    test('is an accessible combobox wired to the listbox', () => {
        render(
            <CommandPaletteInput {...baseProps} activeDescendantId="opt-3" />,
        );

        const input = screen.getByRole('combobox', { name: 'Search commands' });
        expect(input).toHaveAttribute('aria-controls', 'list-1');
        expect(input).toHaveAttribute('aria-activedescendant', 'opt-3');
        expect(input).toHaveAttribute('aria-autocomplete', 'list');
        expect(input).toHaveAttribute('placeholder', 'Type a command...');
    });

    test('omits aria-activedescendant when nothing is active', () => {
        render(<CommandPaletteInput {...baseProps} />);

        expect(screen.getByRole('combobox')).not.toHaveAttribute(
            'aria-activedescendant',
        );
    });

    test('reports typed text and key presses', async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        const onKeyDown = vi.fn();
        render(
            <CommandPaletteInput
                {...baseProps}
                onChange={onChange}
                onKeyDown={onKeyDown}
            />,
        );

        await user.type(screen.getByRole('combobox'), 'a');

        expect(onChange).toHaveBeenCalledWith('a');
        expect(onKeyDown).toHaveBeenCalled();
    });

    test('forwards its ref to the input element', () => {
        const ref = createRef<HTMLInputElement>();
        render(<CommandPaletteInput {...baseProps} ref={ref} />);

        expect(ref.current).toBe(screen.getByRole('combobox'));
    });

    test('renders the breadcrumb of nested steps', () => {
        render(
            <CommandPaletteInput
                {...baseProps}
                breadcrumb={['#12', 'Change status']}
            />,
        );

        const crumbs = screen.getByRole('list', { name: 'Current step' });
        expect(crumbs).toHaveTextContent('#12');
        expect(crumbs).toHaveTextContent('Change status');
    });

    test('renders no breadcrumb at the root', () => {
        render(<CommandPaletteInput {...baseProps} />);

        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    test('is collapsed and controls nothing while there are no results', () => {
        render(<CommandPaletteInput {...baseProps} expanded={false} />);

        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('aria-expanded', 'false');
        expect(input).not.toHaveAttribute('aria-controls');
    });

    test('is expanded and controls the listbox while results are shown', () => {
        render(<CommandPaletteInput {...baseProps} />);

        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('aria-expanded', 'true');
        expect(input).toHaveAttribute('aria-controls', 'list-1');
    });
});
