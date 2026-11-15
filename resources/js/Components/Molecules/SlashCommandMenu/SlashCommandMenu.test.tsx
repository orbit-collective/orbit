import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import SlashCommandMenu from './SlashCommandMenu';

const items = [
    {
        id: 'heading_1',
        icon: 'Heading1' as const,
        title: 'Heading 1',
        description: 'Large section heading',
    },
    {
        id: 'table',
        icon: 'Table' as const,
        title: 'Table',
        description: 'A 3 × 3 table to fill in',
    },
];

const renderMenu = (props = {}) => {
    const onSelect = vi.fn();
    const onHover = vi.fn();

    render(
        <SlashCommandMenu
            id="menu"
            items={items}
            activeIndex={0}
            position={{ top: 200, lineTop: 180, left: 40 }}
            onSelect={onSelect}
            onHover={onHover}
            {...props}
        />,
    );

    return { onSelect, onHover };
};

describe('SlashCommandMenu', () => {
    test('lists every block as an option inside a labelled listbox', () => {
        renderMenu();

        expect(
            screen.getByRole('listbox', { name: 'Insert a block' }),
        ).toBeInTheDocument();
        expect(screen.getAllByRole('option')).toHaveLength(2);
        expect(screen.getByText('Large section heading')).toBeInTheDocument();
    });

    test('marks the active row and derives option ids for aria-activedescendant', () => {
        renderMenu({ activeIndex: 1 });

        const options = screen.getAllByRole('option');

        expect(options[1]).toHaveAttribute('aria-selected', 'true');
        expect(options[0]).toHaveAttribute('aria-selected', 'false');
        expect(options[1]).toHaveAttribute('id', 'menu-option-1');
    });

    test('clicking a row selects it by index', () => {
        const { onSelect } = renderMenu();

        fireEvent.click(screen.getByRole('option', { name: /Table/ }));

        expect(onSelect).toHaveBeenCalledWith(1);
    });

    test('pressing on a row does not steal focus from the editor', () => {
        renderMenu();

        const notPrevented = fireEvent.mouseDown(
            screen.getByRole('option', { name: /Table/ }),
        );

        expect(notPrevented).toBe(false);
    });

    test('hovering a row reports its index', () => {
        const { onHover } = renderMenu();

        fireEvent.mouseEnter(screen.getByRole('option', { name: /Table/ }));

        expect(onHover).toHaveBeenCalledWith(1);
    });

    test('renders nothing when there are no blocks', () => {
        renderMenu({ items: [] });

        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
});
