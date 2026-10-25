import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ColorPicker from './ColorPicker';

const palette = ['#f44336', '#2196f3', '#4caf50'] as const;

const renderPicker = (
    props: Partial<Parameters<typeof ColorPicker>[0]> = {},
) => {
    const onChange = vi.fn();
    const view = render(
        <ColorPicker
            value="#f44336"
            onChange={onChange}
            palette={palette}
            {...props}
        />,
    );

    return { onChange, ...view };
};

const swatch = (color: string) =>
    screen.getByRole('button', { name: `Use color ${color}` });

describe('ColorPicker', () => {
    test('starts closed: the palette dots and a More colors tile, no picker', () => {
        renderPicker();

        palette.forEach((color) => expect(swatch(color)).toBeInTheDocument());
        expect(
            screen.getByRole('button', { name: 'More colors' }),
        ).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByLabelText('Hex color')).not.toBeInTheDocument();
    });

    test('marks the current color and reports another pick', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPicker();

        expect(swatch('#f44336')).toHaveAttribute('aria-pressed', 'true');
        expect(swatch('#2196f3')).toHaveAttribute('aria-pressed', 'false');

        await user.click(swatch('#2196f3'));

        expect(onChange).toHaveBeenCalledWith('#2196f3');
    });

    test('a color outside the palette gets a swatch of its own, shown first and selected', () => {
        renderPicker({ value: '#00aa99' });

        const swatches = screen.getAllByRole('button', { name: /^Use color/ });

        expect(swatches).toHaveLength(4);
        expect(swatches[0]).toHaveAccessibleName('Use color #00aa99');
        expect(swatches[0]).toHaveAttribute('aria-pressed', 'true');
    });

    test('matches the current color regardless of case', () => {
        renderPicker({ value: '#F44336' });

        expect(swatch('#f44336')).toHaveAttribute('aria-pressed', 'true');
        expect(
            screen.getAllByRole('button', { name: /^Use color/ }),
        ).toHaveLength(3);
    });

    test('the tile opens the full picker, and closes it again', async () => {
        const user = userEvent.setup();
        renderPicker();

        await user.click(screen.getByRole('button', { name: 'More colors' }));

        expect(
            screen.getByRole('button', { name: 'Fewer colors' }),
        ).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByLabelText('Hex color')).toHaveValue('#f44336');
        expect(screen.getAllByRole('slider').length).toBeGreaterThan(0);
        // The dots are still there, now as tiles in a grid.
        palette.forEach((color) => expect(swatch(color)).toBeInTheDocument());

        await user.click(screen.getByRole('button', { name: 'Fewer colors' }));

        expect(screen.queryByLabelText('Hex color')).not.toBeInTheDocument();
    });

    test('a pick still works while the picker is open', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPicker();

        await user.click(screen.getByRole('button', { name: 'More colors' }));
        await user.click(swatch('#4caf50'));

        expect(onChange).toHaveBeenCalledWith('#4caf50');
    });

    test('typing a valid hex commits it in lower case, with or without the #', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPicker();

        await user.click(screen.getByRole('button', { name: 'More colors' }));
        const hex = screen.getByLabelText('Hex color');
        await user.clear(hex);
        await user.type(hex, '#00AA99');

        expect(onChange).toHaveBeenLastCalledWith('#00aa99');

        await user.clear(hex);
        await user.type(hex, '7038f4');

        expect(onChange).toHaveBeenLastCalledWith('#7038f4');
    });

    test('an incomplete or invalid hex is not committed, and blur restores the real value', async () => {
        const user = userEvent.setup();
        const { onChange } = renderPicker();

        await user.click(screen.getByRole('button', { name: 'More colors' }));
        const hex = screen.getByLabelText('Hex color');
        await user.clear(hex);
        await user.type(hex, '#12');

        expect(onChange).not.toHaveBeenCalled();

        fireEvent.blur(hex);

        expect(hex).toHaveValue('#f44336');
    });

    test('the hex field follows a color picked elsewhere', async () => {
        const user = userEvent.setup();
        const { rerender } = renderPicker();

        await user.click(screen.getByRole('button', { name: 'More colors' }));
        rerender(
            <ColorPicker
                value="#2196f3"
                onChange={vi.fn()}
                palette={palette}
            />,
        );

        expect(screen.getByLabelText('Hex color')).toHaveValue('#2196f3');
    });
});
