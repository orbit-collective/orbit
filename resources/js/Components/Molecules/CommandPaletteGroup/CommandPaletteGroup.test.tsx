import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import CommandPaletteGroup from './CommandPaletteGroup';

describe('CommandPaletteGroup', () => {
    test('renders a labelled group around its children', () => {
        render(
            <CommandPaletteGroup id="g-nav" label="Navigation">
                <div>child row</div>
            </CommandPaletteGroup>,
        );

        const group = screen.getByRole('group', { name: 'Navigation' });
        expect(group).toBeInTheDocument();
        expect(group).toHaveTextContent('child row');
        expect(screen.getByText('Navigation')).toHaveAttribute('id', 'g-nav');
    });
});
