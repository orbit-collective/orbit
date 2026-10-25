import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import RowAction from './RowAction';

describe('RowAction', () => {
    test('is named by its title and reports clicks', async () => {
        const onClick = vi.fn();
        render(
            <RowAction title="Edit label" icon="Pencil" onClick={onClick} />,
        );

        await userEvent.click(
            screen.getByRole('button', { name: 'Edit label' }),
        );

        expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('does nothing while disabled', async () => {
        const onClick = vi.fn();
        render(
            <RowAction
                title="Move up"
                icon="ArrowUp"
                disabled
                onClick={onClick}
            />,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Move up' }));

        expect(onClick).not.toHaveBeenCalled();
    });

    test('a dangerous action turns red on hover', () => {
        render(
            <RowAction title="Delete" icon="Trash" danger onClick={vi.fn()} />,
        );

        expect(
            screen.getByRole('button', { name: 'Delete' }).className,
        ).toContain('hover:text-[var(--error-color)]');
    });

    test('passes through the popup attributes a Dropdown adds to its trigger', () => {
        render(
            <RowAction
                title="Configure"
                icon="SlidersHorizontal"
                onClick={() => {}}
                aria-haspopup="menu"
                aria-expanded={true}
                aria-controls="menu-1"
            />,
        );

        expect(
            screen.getByRole('button', { name: 'Configure' }),
        ).toHaveAttribute('aria-haspopup', 'menu');
        expect(
            screen.getByRole('button', { name: 'Configure' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(
            screen.getByRole('button', { name: 'Configure' }),
        ).toHaveAttribute('aria-controls', 'menu-1');
    });
});
