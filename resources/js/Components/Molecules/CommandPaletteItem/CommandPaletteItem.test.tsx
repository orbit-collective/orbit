import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { Command } from '@/types/Commands';
import CommandPaletteItem from './CommandPaletteItem';

const command: Command = {
    id: 'issue.create',
    title: 'Create issue',
    group: 'creation',
    icon: 'CirclePlus',
};

const renderItem = (
    overrides: Partial<React.ComponentProps<typeof CommandPaletteItem>> = {},
) =>
    render(
        <CommandPaletteItem
            id="opt-1"
            command={command}
            active={false}
            onSelect={vi.fn()}
            onHover={vi.fn()}
            {...overrides}
        />,
    );

describe('CommandPaletteItem', () => {
    test('renders an option with its title and the given id', () => {
        renderItem();

        const option = screen.getByRole('option');
        expect(option).toHaveAttribute('id', 'opt-1');
        expect(option).toHaveTextContent('Create issue');
    });

    test('reflects the active state in aria-selected', () => {
        const { rerender } = renderItem();
        expect(screen.getByRole('option')).toHaveAttribute(
            'aria-selected',
            'false',
        );

        rerender(
            <CommandPaletteItem
                id="opt-1"
                command={command}
                active
                onSelect={vi.fn()}
                onHover={vi.fn()}
            />,
        );
        expect(screen.getByRole('option')).toHaveAttribute(
            'aria-selected',
            'true',
        );
    });

    test('highlights the matched ranges of the title', () => {
        const { container } = renderItem({
            ranges: [
                [0, 2],
                [7, 10],
            ],
        });

        const marks = Array.from(container.querySelectorAll('mark')).map(
            (m) => m.textContent,
        );
        expect(marks).toEqual(['Cr', 'iss']);
        expect(screen.getByRole('option')).toHaveTextContent('Create issue');
    });

    test('renders the title plainly when there is nothing to highlight', () => {
        const { container } = renderItem();

        expect(container.querySelector('mark')).toBeNull();
    });

    test('clicking runs onSelect and moving the mouse runs onHover', async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn();
        const onHover = vi.fn();
        renderItem({ onSelect, onHover });

        await user.hover(screen.getByRole('option'));
        expect(onHover).toHaveBeenCalled();

        await user.click(screen.getByRole('option'));
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    test('shows the subtitle as meta text', () => {
        renderItem({ command: { ...command, subtitle: 'Orbit' } });

        expect(screen.getByText('Orbit')).toBeInTheDocument();
    });

    test('shows shortcut chips for a combo and for a sequence', () => {
        const { rerender } = renderItem({
            command: { ...command, shortcut: 'alt+p' },
        });
        expect(screen.getByText('P')).toBeInTheDocument();

        rerender(
            <CommandPaletteItem
                id="opt-1"
                command={{ ...command, shortcut: 'g d' }}
                active={false}
                onSelect={vi.fn()}
                onHover={vi.fn()}
            />,
        );
        expect(screen.getByText('G')).toBeInTheDocument();
        expect(screen.getByText('D')).toBeInTheDocument();
    });

    test('only the first binding of an array shortcut is shown', () => {
        renderItem({ command: { ...command, shortcut: ['c', 'ctrl+i'] } });

        expect(screen.getByText('C')).toBeInTheDocument();
        expect(screen.queryByText('CTRL')).not.toBeInTheDocument();
    });

    test('renders no chips when the command has no shortcut', () => {
        const { container } = renderItem();

        expect(container.querySelector('kbd')).toBeNull();
    });

    test('shows a chevron for a command that opens a nested step', () => {
        const { container } = renderItem({
            command: { ...command, children: () => [] },
        });

        expect(
            container.querySelector('svg.lucide-chevron-right'),
        ).not.toBeNull();
    });
});
