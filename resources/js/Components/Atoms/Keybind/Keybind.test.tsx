import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import Keybind from './Keybind';

describe('Keybind Component', () => {
    test('renders the keybind text', () => {
        render(<Keybind tooltipText="Save" keybind="Ctrl+S" />);

        expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    });

    test('renders the tooltip text when tooltip is enabled (default)', () => {
        render(<Keybind tooltipText="Save changes" keybind="Ctrl+S" />);

        expect(screen.getByText('Save changes')).toBeInTheDocument();
    });

    test('does not render tooltip content when tooltip is disabled', () => {
        render(
            <Keybind
                tooltipText="Save changes"
                keybind="Ctrl+S"
                tooltip={false}
            />,
        );

        expect(screen.queryByText('Save changes')).not.toBeInTheDocument();
        expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
    });

    test('uses theme variables instead of hardcoded colors', () => {
        render(<Keybind tooltipText="Save" keybind="S" tooltip={false} />);

        const kbd = screen.getByText('S');
        expect(kbd.className).toContain('var(--bg-light-color)');
        expect(kbd.className).toContain('var(--border-color)');
        expect(kbd.className).toContain('var(--text-gray-color)');
        expect(kbd.className).not.toContain('var(--text-muted-color)');
        expect(kbd.className).not.toMatch(/#[0-9a-f]{3}/i);
    });
});
